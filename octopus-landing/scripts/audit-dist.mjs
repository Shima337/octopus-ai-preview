import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { extname, join, relative, resolve, sep } from 'node:path';

const argumentsAfterScript = process.argv.slice(2);
const isDraftAudit = argumentsAfterScript.includes('--draft');
const artifactArgument = argumentsAfterScript.find((argument) => !argument.startsWith('--'));
const baseArgument = argumentsAfterScript.find((argument) => argument.startsWith('--base='));
const requestedBase = baseArgument?.slice('--base='.length) ?? '/';
const basePath = requestedBase === '/' ? '/' : `/${requestedBase.replace(/^\/+|\/+$/gu, '')}/`;
const distRoot = resolve(artifactArgument ?? 'dist');
const metadataAssets = ['og-image.jpg', 'favicon.svg'];
const legalPages = ['privacy.html', 'offer.html', 'legal.html'];
const mediaExtensions = new Set([
  '.aac', '.avif', '.eot', '.gif', '.heic', '.hevc', '.h265', '.ico', '.jpeg', '.jpg',
  '.m4v', '.mov', '.mp3', '.mp4', '.ogg', '.otf', '.png', '.svg', '.ttf', '.wav',
  '.webm', '.webp', '.woff', '.woff2',
]);
const forbiddenExtensions = new Set(['.heic', '.hevc', '.h265', '.mov']);
const ffprobeBin = process.env.FFPROBE_BIN?.trim()
  || (existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe');
const mediaExtensionPattern = [...mediaExtensions]
  .map((extension) => extension.slice(1))
  .sort((left, right) => right.length - left.length)
  .join('|');
const mediaReferencePattern = new RegExp(
  `(?:^|[("'\`=:\\s])((?:(?:https?:)?\\/\\/|\\.{0,2}\\/)?`
    + `[A-Za-z0-9@._~!$&+,;%/-]+\\.(?:${mediaExtensionPattern})`
    + '(?:[?#][A-Za-z0-9@._~!$&+,;=:%/?#-]*)?)(?=[)"\'\`>\\s,;]|$)',
  'gi',
);
const errors = [];
const draftPublicationPattern = /Документ\s+готовится\s+к\s+публикации/iu;
const noindexMetaPattern = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'])[^>]*>/iu;

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
  if (!indexHtml.includes(`href="${basePath}favicon.svg"`)) {
    errors.push(`dist/index.html must reference ${basePath}favicon.svg`);
  }
  if (!indexHtml.includes(`content="${basePath}og-image.jpg"`)) {
    errors.push(`dist/index.html must reference ${basePath}og-image.jpg`);
  }
}

if (!isDraftAudit) {
  for (const legalPage of legalPages) {
    const legalPath = join(distRoot, legalPage);
    if (!existsSync(legalPath)) {
      errors.push(`Missing release legal page: ${legalPage}`);
      continue;
    }

    const legalHtml = readFileSync(legalPath, 'utf8');
    if (draftPublicationPattern.test(legalHtml)) {
      errors.push(`Release legal page contains a draft publication marker: ${legalPage}`);
    }
    if (noindexMetaPattern.test(legalHtml)) {
      errors.push(`Release legal page remains noindex: ${legalPage}`);
    }
  }
}

const artifactFiles = listFiles(distRoot);
const mediaFiles = artifactFiles.filter((file) => mediaExtensions.has(extname(file).toLowerCase()));
const assetReferences = new Set();

for (const file of artifactFiles) {
  if (!['.css', '.html', '.js'].includes(extname(file).toLowerCase())) continue;
  const contents = readFileSync(file, 'utf8');
  for (const match of contents.matchAll(mediaReferencePattern)) {
    assetReferences.add(match[1]);
  }
}

for (const reference of assetReferences) {
  const path = reference.split(/[?#]/, 1)[0];
  const normalizedPath = path.startsWith(basePath) ? `/${path.slice(basePath.length)}` : path;
  const isPageMedia = normalizedPath.startsWith('/media/');
  const isDeclaredMetadataAsset = metadataAssets.some((asset) => normalizedPath === `/${asset}`);
  if (!isPageMedia && !isDeclaredMetadataAsset) {
    errors.push(`Unexpected media reference outside declared locations: ${reference}`);
    continue;
  }
  if (!existsSync(join(distRoot, normalizedPath.slice(1)))) {
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

const mp4Files = mediaFiles.filter((candidate) => extname(candidate).toLowerCase() === '.mp4');

for (const file of mp4Files) {
  const path = relative(distRoot, file).split(sep).join('/');
  const result = spawnSync(
    ffprobeBin,
    [
      '-v', 'error',
      '-select_streams', 'v',
      '-show_entries', 'stream=codec_name,codec_tag_string,profile,pix_fmt',
      '-of', 'json',
      file,
    ],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 },
  );

  if (result.error) {
    errors.push(`Unable to inspect MP4 ${path} with ${ffprobeBin}: ${result.error.message}`);
    continue;
  }
  if (result.status !== 0) {
    errors.push(`ffprobe failed for ${path}: ${result.stderr.trim() || `exit ${result.status}`}`);
    continue;
  }

  let streams;
  try {
    streams = JSON.parse(result.stdout).streams;
  } catch (error) {
    errors.push(`ffprobe returned invalid JSON for ${path}: ${error.message}`);
    continue;
  }

  if (!Array.isArray(streams) || streams.length === 0) {
    errors.push(`MP4 has no video stream: ${path}`);
    continue;
  }

  streams.forEach((stream, index) => {
    const codec = stream.codec_name ?? 'unknown';
    const tag = stream.codec_tag_string ?? 'unknown';
    const profile = stream.profile ?? 'unknown';
    const pixelFormat = stream.pix_fmt ?? 'unknown';
    const isContractCodec = codec === 'h264' && ['avc1', 'avc3'].includes(tag);
    if (!isContractCodec || profile !== 'High' || pixelFormat !== 'yuv420p') {
      errors.push(
        `Incompatible MP4 video stream in ${path}#${index}: `
        + `codec=${codec}, tag=${tag}, profile=${profile}, pix_fmt=${pixelFormat}; `
        + 'required codec=h264/avc, profile=High, pix_fmt=yuv420p',
      );
    }
  });
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(
  `Artifact media audit passed: ${mediaFiles.length} files and ${assetReferences.size} references; `
  + 'page media is under dist/media/; '
  + 'root metadata exceptions are og-image.jpg and favicon.svg; '
  + `${mp4Files.length} MP4 files are H.264/avc High yuv420p; `
  + (isDraftAudit ? 'draft legal markers were allowed.' : 'release legal pages passed.'),
);
