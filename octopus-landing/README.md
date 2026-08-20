# Octopus AI landing page

Static Vite/React landing page for the Octopus AI Russian-language tutor. Public release is blocked until every owner item in [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) is complete.

## Local setup

Prerequisites: Node.js/npm, plus the Playwright Chromium and WebKit browsers.

```bash
npm ci
npx playwright install chromium webkit
cp .env.example .env.local
```

Set `VITE_TELEGRAM_BOT_URL` in `.env.local` to a Telegram bot URL in one of these forms:

```dotenv
VITE_TELEGRAM_BOT_URL=https://t.me/your_real_bot
```

`npm run build` rejects placeholder, example, and localhost bot names. The safe test URL below is only for local test/build verification and must never be used for public deployment:

```bash
VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm run verify
```

Start the local development server with `npm run dev`. Run individual checks with:

```bash
VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm test -- --run
npm run test:e2e
VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm run build
```

`npm run verify` is the release verification command: unit tests, Chromium/WebKit E2E tests, TypeScript, and the production Vite build. It must complete without warnings.

## Media preparation

The checked-in browser assets under `public/media/` are prepared from owner-supplied originals by `scripts/prepare-media.sh`. The full script expects its listed source files, `curl`, Python 3 with Pillow/WebP support, and FFmpeg (by default `/opt/homebrew/bin/ffmpeg`; override with `FFMPEG_BIN`). It:

- verifies the approved teacher-photo checksum and creates the teacher WebP and social image;
- converts game and review videos to H.264/AAC MP4 with browser-compatible pixel formats;
- creates WebP posters so video is not required on the first screen.

Run the full preparation only when all source files and publication rights are available:

```bash
./scripts/prepare-media.sh
```

To rebuild only identity/social assets, without FFmpeg or private video sources:

```bash
./scripts/prepare-media.sh --identity-only
```

Never add MOV/HEVC originals to `public/` or `dist/`. Review videos also require final consent (including consent for minors) and captions/transcripts; game footage requires publication rights. Re-run `npm run verify` and the bundle/media audit in the release checklist after any media change.

## Static deployment

1. Complete every item in `RELEASE_CHECKLIST.md` and set the real production `VITE_TELEGRAM_BOT_URL` in the build environment.
2. Run `npm run verify` and inspect the generated `dist/` directory.
3. Deploy the contents of `dist/` at the site root on any static host. The app uses root-relative `/media/...` and legal-page URLs, so a subdirectory deployment requires a corresponding Vite base-path change.
4. Configure the host to serve `index.html`, the three legal HTML documents, and `media/` unchanged. Give `dist/media/` an explicit CDN/cache policy and purge or version media when replacing a file.
5. On the deployed URL, repeat the real-device, link, console, analytics, and Lighthouse checks in the release checklist before opening traffic.

Do not deploy a build made with the test bot URL. `dist/` is generated output and should be rebuilt for each release.
