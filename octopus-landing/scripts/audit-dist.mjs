import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const distRoot = resolve(process.argv[2] ?? 'dist');
const metadataAssets = ['og-image.jpg', 'favicon.svg'];
const mediaExtensions = new Set([
  '.aac', '.avif', '.gif', '.heic', '.hevc', '.h265', '.ico', '.jpeg', '.jpg',
  '.m4v', '.mov', '.mp3', '.mp4', '.ogg', '.png', '.svg', '.wav', '.webm', '.webp',
]);
const forbiddenExtensions = new Set(['.heic', '.hevc', '.h265', '.mov']);
const errors = [];

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

if (!existsSync(distRoot)) {
  console.error(`Artifact directory does not exist: ${distRoot}`);
  process.exit(1);
}

for (const asset of metadataAssets) {
  if (!existsSync(join(distRoot, asset))) errors.push(`Missing root metadata asset: ${asset}`);
}

const indexPath = join(distRoot, 'index.html');
if (!existsSync(indexPath)) {
  errors.push('Missing dist/index.html');
} else {
  const indexHtml = readFileSync(indexPath, 'utf8');
  if (!indexHtml.includes('href="/favicon.svg"')) {
    errors.push('dist/index.html must reference the stable root URL /favicon.svg');
  }
  if (!indexHtml.includes('content="/og-image.jpg"')) {
    errors.push('dist/index.html must reference the stable root URL /og-image.jpg');
  }
}

const artifactFiles = listFiles(distRoot);
const mediaFiles = artifactFiles.filter((file) => mediaExtensions.has(extname(file).toLowerCase()));
const assetReferences = new Set();

for (const file of artifactFiles) {
  if (!['.css', '.html', '.js'].includes(extname(file).toLowerCase())) continue;
  const contents = readFileSync(file, 'utf8');
  for (const match of contents.matchAll(/\/(?:media\/[A-Za-z0-9._/-]+|og-image\.jpg|favicon\.svg)/g)) {
    assetReferences.add(match[0].slice(1));
  }
}

for (const reference of assetReferences) {
  if (!existsSync(join(distRoot, reference))) {
    errors.push(`Referenced media asset is missing from dist: ${reference}`);
  }
}

for (const file of mediaFiles) {
  const path = relative(distRoot, file).split(sep).join('/');
  const extension = extname(path).toLowerCase();

  if (forbiddenExtensions.has(extension)) {
    errors.push(`Forbidden source media format in dist: ${path}`);
    continue;
  }

  const isPageMedia = path.startsWith('media/');
  const isDeclaredMetadataAsset = metadataAssets.includes(path);
  if (!isPageMedia && !isDeclaredMetadataAsset) {
    errors.push(`Unexpected media outside dist/media/: ${path}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(
  `Artifact media audit passed: ${mediaFiles.length} files and ${assetReferences.size} references; `
  + 'page media is under dist/media/; '
  + 'root metadata exceptions are og-image.jpg and favicon.svg.',
);
