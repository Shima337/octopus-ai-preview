# Octopus AI public-release gate

**STOP:** do not publish or open traffic while any owner-supplied item below is unchecked. `https://t.me/octopus_test_bot` may be used only for local build and test verification; it is not a release URL.

## Owner-supplied content, consent, and configuration

- [ ] Supply and verify the real production Telegram bot URL.
- [ ] Confirm the advertised prices: 49 BYN/month for the AI tutor and 199 BYN/month for the live course.
- [ ] Confirm the exact free-week eligibility, billing, cancellation, and renewal terms shown to visitors.
- [ ] Supply and approve the offer that replaces the “through 31 August 2026” promotion after it expires.
- [ ] Approve Lyudmila Ershova’s facts and obtain publication rights for her name and photo.
- [ ] Obtain final publication consent for all seven review participants, including every required parent/guardian or minor consent.
- [ ] Supply and approve captions/transcripts for all seven review videos.
- [ ] Obtain publication rights for every game video and its visible/audio content.
- [ ] Replace the draft privacy policy, public offer, and legal-details pages with final approved legal documents and entity/contact details.
- [ ] Supply the production analytics provider and IDs, configure it, and verify consent/compliance requirements.

## Technical verification

- [ ] `VITE_TELEGRAM_BOT_URL=<real-url> npm run verify` completes without warnings: unit tests pass, Chromium/WebKit E2E tests pass, TypeScript passes, and Vite creates `dist/`.
- [ ] `npm run audit:dist` confirms every referenced image/video/audio/font and metadata asset exists in a declared location, all page photo/video/poster media is under `dist/media/`, the only root metadata exceptions are the present and referenced `dist/og-image.jpg` and `dist/favicon.svg`, no MOV/HEVC source is shipped, every MP4 stream is H.264/avc High with `yuv420p`, and the first screen has no video dependency.
- [ ] Deployed cache rules are verified: `dist/media/` uses the approved long-lived/purge-or-version policy, while `/og-image.jpg` and `/favicon.svg` revalidate or use a shorter lifetime and are purged when replaced.
- [ ] Deployed site is checked on real current iOS/Safari and Android/Chrome devices at supported phone widths.
- [ ] Every CTA, legal link, media control, and external link is checked on the deployed production URL.
- [ ] Browser consoles and network panels are clean on the deployed production URL; analytics events reach the configured provider without leaking sensitive data.
- [ ] Mobile Lighthouse Accessibility is at least 90.
- [ ] Mobile Lighthouse Best Practices is at least 90.
- [ ] Mobile Lighthouse Performance target is at least 85 after final real-media optimization.
- [ ] Mobile Lighthouse SEO is recorded and any release-impacting findings are resolved.

## Latest local release-candidate evidence

- Audit date: 2026-08-20 14:34 (Europe/Minsk)
- URL: `http://127.0.0.1:4173/`, local preview built with `https://t.me/octopus_test_bot` (verification only)
- Lighthouse: 12.8.2, mobile form factor
- Performance: **98** (target ≥85)
- Accessibility: **100** (required ≥90)
- Best Practices: **100** (required ≥90)
- SEO: **100**
- [x] Safe-test-URL `npm run verify`: 49 unit tests and 19 Chromium/WebKit E2E tests passed; TypeScript, Vite build, and the executable artifact audit passed without warnings.
- [x] Local `dist/` audit: all 27 production page-media/metadata references resolve; 26 page/support media files are isolated under `dist/media/`; the only root metadata assets are the required `dist/og-image.jpg` and `dist/favicon.svg`; no MOV/HEVC/H.265/HEIC file is shipped; every MP4 video stream is H.264 High/yuv420p.
- [x] First-screen audit: the hero uses the teacher WebP and contains no video element; game/review videos appear only in later sections.

Local evidence does not clear the owner-supplied gates or replace the deployed production and real-device checks above.
