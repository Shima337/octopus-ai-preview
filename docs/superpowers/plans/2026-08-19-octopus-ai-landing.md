# Octopus AI Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, responsive advertising landing page that sends Belarusian ЦЭ/ЦТ students directly into a free first lesson with the «Осьминог» Telegram AI tutor.

**Architecture:** Create a new static React + TypeScript + Vite application in `octopus-landing`, with all commercial copy and links in typed configuration. Compose the page from focused section components, keep interactive video behavior in reusable hooks/components, and ship optimized local media with no backend or form handling.

**Tech Stack:** React 19, TypeScript 5, Vite 7, Vitest, React Testing Library, Playwright, CSS Modules/global CSS, FFmpeg media preprocessing.

**Spec:** `docs/superpowers/specs/2026-08-19-octopus-ai-landing-design.md`

## Global Constraints

- The page is exclusively for Belarusian ЦЭ/ЦТ preparation in Russian language.
- AI tutor price is 49 BYN/month; live course price is 199 BYN/month.
- The first topic starts immediately and includes 7 days of full access with no payment today.
- Every primary CTA uses the single `VITE_TELEGRAM_BOT_URL` value and opens Telegram directly; there is no lead form.
- The live-course CTA links to `https://www.ct-bratan.by/`.
- The promotion expires at the end of 31 August 2026 in `Europe/Minsk`; expired promo copy must disappear automatically.
- Teacher evidence is phrased as Lyudmila Ershova's/methodology's evidence, not as historical AI-product outcomes.
- Do not add names, scores, or result claims to reviews without confirmed data.
- Autoplay video is always muted and `playsInline`; sound starts only after explicit user action.
- Mobile-first layouts must have no overlap or horizontal page overflow at 320, 360, 393, and 430 px.
- Production builds fail when the Telegram URL is missing, malformed, or an example value.
- Do not publish media until usage rights and minor consent are confirmed.

---

## File Structure

```text
octopus-landing/
├── .env.example                     # documented public runtime variables
├── package.json                     # scripts and pinned dependencies
├── playwright.config.ts             # browser and viewport test setup
├── vite.config.ts                   # Vite/Vitest configuration
├── index.html                       # SEO shell and application mount
├── scripts/
│   ├── prepare-media.sh             # deterministic FFmpeg conversions
│   └── validate-production-env.mjs  # production Telegram URL guard
├── public/
│   ├── favicon.svg
│   ├── og-image.jpg
│   └── media/
│       ├── lyudmila.webp
│       ├── games/                   # five optimized MP4/poster pairs
│       └── reviews/                 # seven full MP4/poster pairs
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # section composition only
│   ├── config/
│   │   ├── content.ts               # typed copy, prices, links, media metadata
│   │   └── content.test.ts          # promo/link/content rules
│   ├── lib/
│   │   ├── analytics.ts             # non-blocking event adapter
│   │   ├── analytics.test.ts
│   │   ├── promo.ts                 # Minsk-time promotion status
│   │   └── promo.test.ts
│   ├── hooks/
│   │   ├── useInViewport.ts         # IntersectionObserver state
│   │   └── useInViewport.test.tsx
│   ├── components/
│   │   ├── TelegramCta.tsx          # shared tracked Telegram link
│   │   ├── TelegramCta.test.tsx
│   │   ├── SectionHeading.tsx
│   │   ├── MediaCarousel.tsx        # reusable accessible horizontal carousel
│   │   ├── MediaCarousel.test.tsx
│   │   ├── ReviewGallery.tsx        # circular previews and modal playback
│   │   ├── ReviewGallery.test.tsx
│   │   ├── Faq.tsx                  # accessible accordion
│   │   └── Faq.test.tsx
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── TopicJourney.tsx
│   │   ├── AiProof.tsx
│   │   ├── Games.tsx
│   │   ├── Reviews.tsx
│   │   ├── Pricing.tsx
│   │   ├── FinalCta.tsx
│   │   └── Footer.tsx
│   └── styles/
│       ├── tokens.css                # colors, type scale, spacing, radii
│       ├── global.css                # reset, page layout, accessibility
│       └── sections.css              # responsive section styling
└── tests/
    ├── landing.spec.ts               # user journey and interaction E2E
    ├── responsive.spec.ts            # overflow and overlap checks
    └── media.spec.ts                 # autoplay, sound, and failure states
```

### Task 1: Scaffold the Tested Static Application

**Files:**
- Create: `octopus-landing/package.json`
- Create: `octopus-landing/vite.config.ts`
- Create: `octopus-landing/tsconfig.json`
- Create: `octopus-landing/tsconfig.app.json`
- Create: `octopus-landing/index.html`
- Create: `octopus-landing/src/main.tsx`
- Create: `octopus-landing/src/App.tsx`
- Create: `octopus-landing/src/test/setup.ts`
- Create: `octopus-landing/src/App.test.tsx`
- Create: `octopus-landing/.gitignore`

**Interfaces:**
- Consumes: none.
- Produces: `App(): JSX.Element`, `npm run dev`, `npm test`, and `npm run build`.

- [ ] **Step 1: Write the failing smoke test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('identifies the ЦЭ/ЦТ Russian-language product', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ЦЭ\/ЦТ по русскому/i);
  });
});
```

- [ ] **Step 2: Run the test and verify the empty project fails**

Run: `cd octopus-landing && npm test -- --run src/App.test.tsx`

Expected: FAIL because the application and test configuration do not exist.

- [ ] **Step 3: Add the Vite/React project and minimal app**

Use scripts and dependencies:

```json
{
  "scripts": {
    "dev": "vite",
    "test": "vitest",
    "build": "node scripts/validate-production-env.mjs && tsc -b && vite build",
    "build:local": "tsc -b && vite build",
    "preview": "vite preview",
    "test:e2e": "playwright test"
  },
  "dependencies": { "react": "^19.1.1", "react-dom": "^19.1.1" },
  "devDependencies": { "@playwright/test": "^1.54.2", "@testing-library/jest-dom": "^6.6.4", "@testing-library/react": "^16.3.0", "@types/react": "^19.1.10", "@types/react-dom": "^19.1.7", "@vitejs/plugin-react": "^5.0.0", "jsdom": "^26.1.0", "typescript": "^5.9.2", "vite": "^7.1.2", "vitest": "^3.2.4" }
}
```

Implement `App.tsx` with a semantic `<main>` and temporary H1 `Подготовься к ЦЭ/ЦТ по русскому`; configure Vitest with `environment: 'jsdom'` and `src/test/setup.ts` importing `@testing-library/jest-dom/vitest`.

- [ ] **Step 4: Install and verify the scaffold**

Run: `cd octopus-landing && npm install && npm test -- --run src/App.test.tsx && npm run build:local`

Expected: one passing test and a successful `dist/` build.

- [ ] **Step 5: Commit the scaffold**

```bash
git add octopus-landing/package.json octopus-landing/package-lock.json octopus-landing/vite.config.ts octopus-landing/tsconfig*.json octopus-landing/index.html octopus-landing/src octopus-landing/.gitignore
git commit -m "feat: scaffold Octopus landing app"
```

### Task 2: Add Typed Commercial Configuration and Production Guards

**Files:**
- Create: `octopus-landing/.env.example`
- Create: `octopus-landing/scripts/validate-production-env.mjs`
- Create: `octopus-landing/src/config/content.ts`
- Create: `octopus-landing/src/config/content.test.ts`
- Create: `octopus-landing/src/lib/promo.ts`
- Create: `octopus-landing/src/lib/promo.test.ts`
- Modify: `octopus-landing/package.json`

**Interfaces:**
- Consumes: `import.meta.env.VITE_TELEGRAM_BOT_URL`.
- Produces: `siteContent: SiteContent`, `isPromoActive(now: Date, deadline: string): boolean`, and a production-build exit code of 1 for unsafe bot URLs.

- [ ] **Step 1: Write failing configuration and promotion tests**

```ts
// src/lib/promo.test.ts
import { expect, it } from 'vitest';
import { isPromoActive } from './promo';

it('keeps the promotion active through 31 August in Minsk', () => {
  expect(isPromoActive(new Date('2026-08-31T20:59:59Z'), '2026-08-31')).toBe(true);
  expect(isPromoActive(new Date('2026-08-31T21:00:00Z'), '2026-08-31')).toBe(false);
});
```

```ts
// src/config/content.test.ts
import { expect, it } from 'vitest';
import { siteContent } from './content';

it('keeps the approved prices and external course URL', () => {
  expect(siteContent.aiPrice).toBe(49);
  expect(siteContent.livePrice).toBe(199);
  expect(siteContent.liveCourseUrl).toBe('https://www.ct-bratan.by/');
  expect(siteContent.games).toHaveLength(5);
  expect(siteContent.reviews).toHaveLength(7);
});
```

- [ ] **Step 2: Run tests and verify missing modules fail**

Run: `cd octopus-landing && npm test -- --run src/lib/promo.test.ts src/config/content.test.ts`

Expected: FAIL with unresolved `promo` and `content` modules.

- [ ] **Step 3: Implement exact types and content**

Define these public types in `content.ts`:

```ts
export type MediaItem = { id: string; src: string; poster: string; label: string };
export type SiteContent = {
  telegramUrl: string;
  liveCourseUrl: string;
  aiPrice: 49;
  livePrice: 199;
  promoDeadline: '2026-08-31';
  teacher: { name: 'Людмила Ершова'; experienceYears: 20; hundredPointStudents: '8+' };
  games: MediaItem[];
  reviews: MediaItem[];
};
```

Set the media URLs to `/media/games/game-01.mp4` through `game-05.mp4` and `/media/reviews/review-01.mp4` through `review-07.mp4`, each with matching `.webp` poster. Implement the Minsk deadline as `new Date(`${deadline}T23:59:59+03:00`)`.

Create `.env.example` containing `VITE_TELEGRAM_BOT_URL=https://t.me/replace_with_real_bot`. The validator accepts only `https://t.me/<name>` or `tg://resolve?domain=<name>`, and rejects empty strings, `replace_with_real_bot`, `example`, and `localhost`.

- [ ] **Step 4: Verify tests and guard behavior**

Run: `cd octopus-landing && npm test -- --run src/lib/promo.test.ts src/config/content.test.ts`

Expected: all tests PASS.

Run: `cd octopus-landing && VITE_TELEGRAM_BOT_URL=https://t.me/replace_with_real_bot node scripts/validate-production-env.mjs`

Expected: exit 1 with `A real VITE_TELEGRAM_BOT_URL is required for production.`

Run: `cd octopus-landing && VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot node scripts/validate-production-env.mjs`

Expected: exit 0.

- [ ] **Step 5: Commit configuration**

```bash
git add octopus-landing/.env.example octopus-landing/scripts/validate-production-env.mjs octopus-landing/src/config octopus-landing/src/lib/promo.ts octopus-landing/src/lib/promo.test.ts octopus-landing/package.json
git commit -m "feat: add typed landing configuration"
```

### Task 3: Build the Visual Foundation, Hero, Journey, and AI Proof

**Files:**
- Create: `octopus-landing/src/styles/tokens.css`
- Create: `octopus-landing/src/styles/global.css`
- Create: `octopus-landing/src/styles/sections.css`
- Create: `octopus-landing/src/components/SectionHeading.tsx`
- Create: `octopus-landing/src/sections/Hero.tsx`
- Create: `octopus-landing/src/sections/TopicJourney.tsx`
- Create: `octopus-landing/src/sections/AiProof.tsx`
- Create: `octopus-landing/src/sections/core-sections.test.tsx`
- Modify: `octopus-landing/src/App.tsx`
- Modify: `octopus-landing/src/main.tsx`

**Interfaces:**
- Consumes: `siteContent.teacher`, `siteContent.aiPrice`, and `TelegramCta` from Task 4; until Task 4 lands, Hero accepts `cta: ReactNode` so its test can pass with a plain link.
- Produces: `Hero`, `TopicJourney`, and `AiProof` section components.

- [ ] **Step 1: Write failing content/semantics tests**

```tsx
// src/sections/core-sections.test.tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Hero } from './Hero';
import { TopicJourney } from './TopicJourney';
import { AiProof } from './AiProof';

it('shows price, free access, and teacher authority in the hero', () => {
  render(<Hero cta={<a href="https://t.me/test_bot">Пройти тему бесплатно</a>} />);
  expect(screen.getByText(/49 BYN/)).toBeInTheDocument();
  expect(screen.getByText(/7 дней полного доступа/)).toBeInTheDocument();
  expect(screen.getByText(/20 лет/)).toBeInTheDocument();
});

it('renders all five topic stages and corrective AI behavior', () => {
  render(<><TopicJourney /><AiProof /></>);
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getByText(/доводит до понимания/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify components are missing**

Run: `cd octopus-landing && npm test -- --run src/sections/core-sections.test.tsx`

Expected: FAIL with unresolved section imports.

- [ ] **Step 3: Implement semantic sections and mobile-first CSS**

Build Hero with the approved copy order and `<img src="/media/lyudmila.webp" width="720" height="900">`. Render the topic journey as an ordered list with exactly five stages. Render the AI proof as a compact chat transcript where the tutor diagnoses an unstressed-vowel error, reframes the rule, asks one follow-up, and confirms understanding without exposing a guaranteed-score claim.

Define CSS custom properties for lavender, purple, yellow, lime, ink, white, spacing, radii, and fluid type via `clamp()`. Hero uses normal grid flow; at max-width 767px it is a single column with no absolutely positioned text, price, or CTA.

- [ ] **Step 4: Run the section tests**

Run: `cd octopus-landing && npm test -- --run src/sections/core-sections.test.tsx`

Expected: all tests PASS.

- [ ] **Step 5: Commit the visual foundation**

```bash
git add octopus-landing/src/App.tsx octopus-landing/src/main.tsx octopus-landing/src/styles octopus-landing/src/components/SectionHeading.tsx octopus-landing/src/sections/Hero.tsx octopus-landing/src/sections/TopicJourney.tsx octopus-landing/src/sections/AiProof.tsx octopus-landing/src/sections/core-sections.test.tsx
git commit -m "feat: build landing hero and learning journey"
```

### Task 4: Add Tracked Telegram CTAs and Analytics Adapter

**Files:**
- Create: `octopus-landing/src/lib/analytics.ts`
- Create: `octopus-landing/src/lib/analytics.test.ts`
- Create: `octopus-landing/src/components/TelegramCta.tsx`
- Create: `octopus-landing/src/components/TelegramCta.test.tsx`
- Modify: `octopus-landing/src/sections/Hero.tsx`

**Interfaces:**
- Consumes: `siteContent.telegramUrl`.
- Produces: `track(event: AnalyticsEvent): void` and `TelegramCta({ placement, children, className? }): JSX.Element`.

- [ ] **Step 1: Write failing tracking tests**

```tsx
// src/components/TelegramCta.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import * as analytics from '../lib/analytics';
import { TelegramCta } from './TelegramCta';

it('tracks placement without preventing Telegram navigation', () => {
  const spy = vi.spyOn(analytics, 'track').mockImplementation(() => undefined);
  render(<TelegramCta placement="hero">Пройти тему бесплатно</TelegramCta>);
  const link = screen.getByRole('link');
  fireEvent.click(link);
  expect(spy).toHaveBeenCalledWith({ name: 'telegram_cta_click', placement: 'hero' });
  expect(link).toHaveAttribute('href', expect.stringMatching(/^(https:\/\/t\.me\/|tg:\/\/resolve)/));
});
```

- [ ] **Step 2: Run tests and verify missing modules fail**

Run: `cd octopus-landing && VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm test -- --run src/components/TelegramCta.test.tsx`

Expected: FAIL with unresolved modules.

- [ ] **Step 3: Implement typed, non-blocking tracking**

```ts
export type AnalyticsEvent =
  | { name: 'telegram_cta_click'; placement: 'hero' | 'games' | 'pricing' | 'final' }
  | { name: 'live_course_click' }
  | { name: 'game_slide_change'; id: string }
  | { name: 'review_open' | 'review_complete'; id: string }
  | { name: 'faq_open'; id: string };

export function track(event: AnalyticsEvent): void {
  window.dispatchEvent(new CustomEvent('octopus:analytics', { detail: event }));
  window.dataLayer?.push(event);
}
```

Add a `Window` declaration for optional `dataLayer`. `TelegramCta` is a normal anchor, preserves current UTM data by appending a compact `start` parameter only when the configured Telegram URL supports it, and never calls `preventDefault()`.

- [ ] **Step 4: Verify tracking and integrate the hero CTA**

Run: `cd octopus-landing && VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm test -- --run src/lib/analytics.test.ts src/components/TelegramCta.test.tsx src/sections/core-sections.test.tsx`

Expected: all tests PASS.

- [ ] **Step 5: Commit CTA infrastructure**

```bash
git add octopus-landing/src/lib/analytics.ts octopus-landing/src/lib/analytics.test.ts octopus-landing/src/components/TelegramCta.tsx octopus-landing/src/components/TelegramCta.test.tsx octopus-landing/src/sections/Hero.tsx
git commit -m "feat: add tracked Telegram conversion links"
```

### Task 5: Prepare and Integrate Game Media

**Files:**
- Create: `octopus-landing/scripts/prepare-media.sh`
- Create: `octopus-landing/src/hooks/useInViewport.ts`
- Create: `octopus-landing/src/hooks/useInViewport.test.tsx`
- Create: `octopus-landing/src/components/MediaCarousel.tsx`
- Create: `octopus-landing/src/components/MediaCarousel.test.tsx`
- Create: `octopus-landing/src/sections/Games.tsx`
- Create: `octopus-landing/public/media/games/game-01.mp4` through `game-05.mp4`
- Create: `octopus-landing/public/media/games/game-01.webp` through `game-05.webp`
- Modify: `octopus-landing/src/App.tsx`
- Modify: `octopus-landing/src/styles/sections.css`

**Interfaces:**
- Consumes: `siteContent.games`, `track()`, and `TelegramCta`.
- Produces: `useInViewport<T extends Element>(): [RefObject<T>, boolean]` and `MediaCarousel({ items, ariaLabel }): JSX.Element`.

- [ ] **Step 1: Write failing carousel behavior tests**

```tsx
// src/components/MediaCarousel.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MediaCarousel } from './MediaCarousel';

const items = [1, 2, 3].map((n) => ({ id: `g${n}`, src: `/g${n}.mp4`, poster: `/g${n}.webp`, label: `Игра ${n}` }));

it('exposes labelled navigation and muted inline videos', () => {
  render(<MediaCarousel items={items} ariaLabel="Игры по правилам" />);
  expect(screen.getByRole('region', { name: 'Игры по правилам' })).toBeInTheDocument();
  const videos = document.querySelectorAll('video');
  expect(videos).toHaveLength(3);
  videos.forEach((video) => expect(video).toHaveProperty('muted', true));
  fireEvent.click(screen.getByRole('button', { name: /следующая/i }));
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify missing carousel fails**

Run: `cd octopus-landing && npm test -- --run src/components/MediaCarousel.test.tsx src/hooks/useInViewport.test.tsx`

Expected: FAIL with unresolved component and hook.

- [ ] **Step 3: Add deterministic media conversion**

`prepare-media.sh` maps the five approved source files in their listed order. For each one run the equivalent of:

```bash
ffmpeg -y -i "$source" -an -vf "scale=720:-2:flags=lanczos" -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart -crf 24 "public/media/games/game-01.mp4"
ffmpeg -y -ss 00:00:01 -i "$source" -frames:v 1 -vf "scale=480:-2:flags=lanczos" -c:v libwebp -quality 78 "public/media/games/game-01.webp"
```

The script uses explicit source paths from the spec, checks `ffmpeg` first, creates only the two target media directories, and exits on any failed conversion.

- [ ] **Step 4: Implement viewport-aware carousel and games section**

Use `IntersectionObserver` with threshold `0.2`; play a video only while visible, muted, motion is allowed, and `navigator.connection?.saveData !== true`. Catch rejected `play()` promises and leave the poster visible. Implement native horizontal scrolling with CSS scroll snap, previous/next buttons, active counter, keyboard-safe controls, and a `games` CTA below the carousel.

- [ ] **Step 5: Convert media and verify tests**

Run: `cd octopus-landing && bash scripts/prepare-media.sh`

Expected: five MP4 files and five WebP posters exist; each MP4 is H.264/yuv420p and each poster is readable.

Run: `cd octopus-landing && npm test -- --run src/hooks/useInViewport.test.tsx src/components/MediaCarousel.test.tsx`

Expected: all tests PASS.

- [ ] **Step 6: Commit games and optimized assets**

```bash
git add octopus-landing/scripts/prepare-media.sh octopus-landing/src/hooks octopus-landing/src/components/MediaCarousel.tsx octopus-landing/src/components/MediaCarousel.test.tsx octopus-landing/src/sections/Games.tsx octopus-landing/src/App.tsx octopus-landing/src/styles/sections.css octopus-landing/public/media/games
git commit -m "feat: add real learning game carousel"
```

### Task 6: Build Circular Video Reviews with Exclusive Sound

**Files:**
- Create: `octopus-landing/src/components/ReviewGallery.tsx`
- Create: `octopus-landing/src/components/ReviewGallery.test.tsx`
- Create: `octopus-landing/src/sections/Reviews.tsx`
- Create: `octopus-landing/public/media/reviews/review-01.mp4` through `review-07.mp4`
- Create: `octopus-landing/public/media/reviews/review-01.webp` through `review-07.webp`
- Modify: `octopus-landing/scripts/prepare-media.sh`
- Modify: `octopus-landing/src/App.tsx`
- Modify: `octopus-landing/src/styles/sections.css`

**Interfaces:**
- Consumes: `siteContent.reviews`, `useInViewport`, and `track()`.
- Produces: `ReviewGallery({ items }): JSX.Element` with one active modal review ID or `null`.

- [ ] **Step 1: Write failing modal and sound tests**

```tsx
// src/components/ReviewGallery.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ReviewGallery } from './ReviewGallery';

const items = [1, 2].map((n) => ({ id: `r${n}`, src: `/r${n}.mp4`, poster: `/r${n}.webp`, label: `Отзыв ученика ${n}` }));

it('keeps previews muted and opens one labelled sound modal', () => {
  render(<ReviewGallery items={items} />);
  document.querySelectorAll('video').forEach((video) => expect(video).toHaveProperty('muted', true));
  fireEvent.click(screen.getByRole('button', { name: /отзыв ученика 1/i }));
  expect(screen.getByRole('dialog', { name: /отзыв ученика 1/i })).toBeInTheDocument();
  expect(screen.getByTestId('active-review')).toHaveProperty('muted', false);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify gallery is missing**

Run: `cd octopus-landing && npm test -- --run src/components/ReviewGallery.test.tsx`

Expected: FAIL with unresolved `ReviewGallery`.

- [ ] **Step 3: Extend media conversion for seven reviews**

Map the seven approved files in the exact order recorded in the spec. Preserve AAC audio and produce H.264/yuv420p MP4 with `-movflags +faststart -crf 24`; create a square 400×400 WebP poster at one second. Do not create cropped preview videos: reuse the optimized full file and rely on lazy loading plus `preload="metadata"`.

- [ ] **Step 4: Implement accessible circular previews and modal**

Wrap each preview video in `aspect-ratio: 1; border-radius: 50%; overflow: hidden; background: transparent`; set the video to `display: block; width: 100%; height: 100%; object-fit: cover`. The modal uses `role="dialog"`, `aria-modal="true"`, labelled close button, focus return, Escape/backdrop closing, and scroll lock. On open, pause previews, seek the selected full video to zero, unmute it, and call `play()` after the click. On close, pause/unload the modal and resume eligible muted previews.

- [ ] **Step 5: Convert review assets and run tests**

Run: `cd octopus-landing && bash scripts/prepare-media.sh`

Expected: seven review MP4 files with AAC audio and seven square WebP posters.

Run: `cd octopus-landing && npm test -- --run src/components/ReviewGallery.test.tsx`

Expected: all tests PASS.

- [ ] **Step 6: Commit reviews**

```bash
git add octopus-landing/scripts/prepare-media.sh octopus-landing/src/components/ReviewGallery.tsx octopus-landing/src/components/ReviewGallery.test.tsx octopus-landing/src/sections/Reviews.tsx octopus-landing/src/App.tsx octopus-landing/src/styles/sections.css octopus-landing/public/media/reviews
git commit -m "feat: add circular student video reviews"
```

### Task 7: Add Pricing, FAQ, Final CTA, and Footer

**Files:**
- Create: `octopus-landing/src/components/Faq.tsx`
- Create: `octopus-landing/src/components/Faq.test.tsx`
- Create: `octopus-landing/src/sections/Pricing.tsx`
- Create: `octopus-landing/src/sections/FinalCta.tsx`
- Create: `octopus-landing/src/sections/Footer.tsx`
- Create: `octopus-landing/src/sections/conversion-sections.test.tsx`
- Create: `octopus-landing/public/privacy.html`
- Create: `octopus-landing/public/offer.html`
- Create: `octopus-landing/public/legal.html`
- Modify: `octopus-landing/src/config/content.ts`
- Modify: `octopus-landing/src/App.tsx`
- Modify: `octopus-landing/src/styles/sections.css`

**Interfaces:**
- Consumes: `isPromoActive`, `siteContent`, `TelegramCta`, and `track()`.
- Produces: `Pricing({ now? = new Date() })`, `Faq`, `FinalCta`, and `Footer`.

- [ ] **Step 1: Write failing conversion-section tests**

```tsx
// src/sections/conversion-sections.test.tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Pricing } from './Pricing';
import { Faq } from '../components/Faq';

it('shows the active promotion and hides it after the deadline', () => {
  const { rerender } = render(<Pricing now={new Date('2026-08-31T20:00:00Z')} />);
  expect(screen.getByText(/вместо 248 BYN/i)).toBeInTheDocument();
  rerender(<Pricing now={new Date('2026-08-31T21:00:00Z')} />);
  expect(screen.queryByText(/вместо 248 BYN/i)).not.toBeInTheDocument();
});

it('renders six closed FAQ controls', () => {
  render(<Faq />);
  const buttons = screen.getAllByRole('button');
  expect(buttons).toHaveLength(6);
  buttons.forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'false'));
});
```

- [ ] **Step 2: Run tests and verify missing sections fail**

Run: `cd octopus-landing && VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm test -- --run src/sections/conversion-sections.test.tsx src/components/Faq.test.tsx`

Expected: FAIL with unresolved modules.

- [ ] **Step 3: Implement the two pricing choices**

The AI card leads visually and states `49 BYN / месяц`, `7 дней бесплатно`, and `Сегодня 0 BYN`. The live card states `199 BYN / месяц`, links to the existing site, and conditionally renders `AI включён до 31 августа — 199 BYN вместо 248 BYN` only while `isPromoActive()` returns true. Track the live-course link without preventing navigation.

- [ ] **Step 4: Implement FAQ and closing sections**

Create exactly the six approved questions with concise answers from the spec. Use buttons with `aria-expanded`, `aria-controls`, unique answer IDs, and only render/open the selected panel state. The final CTA uses placement `final`. Footer contains the brand and links to `/privacy.html`, `/offer.html`, and `/legal.html`; until legal text is supplied, each static page contains `Документ готовится к публикации` and `<meta name="robots" content="noindex">`—the release checklist must block public deployment until replaced.

- [ ] **Step 5: Run tests and full unit suite**

Run: `cd octopus-landing && VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm test -- --run`

Expected: all unit/component tests PASS.

- [ ] **Step 6: Commit conversion sections**

```bash
git add octopus-landing/src/components/Faq.tsx octopus-landing/src/components/Faq.test.tsx octopus-landing/src/sections/Pricing.tsx octopus-landing/src/sections/FinalCta.tsx octopus-landing/src/sections/Footer.tsx octopus-landing/src/sections/conversion-sections.test.tsx octopus-landing/src/config/content.ts octopus-landing/src/App.tsx octopus-landing/src/styles/sections.css octopus-landing/public/privacy.html octopus-landing/public/offer.html octopus-landing/public/legal.html
git commit -m "feat: complete landing conversion sections"
```

### Task 8: Add SEO Assets and Teacher Media

**Files:**
- Create: `octopus-landing/public/media/lyudmila.webp`
- Create: `octopus-landing/public/og-image.jpg`
- Create: `octopus-landing/public/favicon.svg`
- Create: `octopus-landing/src/seo.test.tsx`
- Modify: `octopus-landing/index.html`
- Modify: `octopus-landing/scripts/prepare-media.sh`

**Interfaces:**
- Consumes: Lyudmila source photo `https://www.ct-bratan.by/assets/lyudmila-ershova-BAE4kYzB.jpg`.
- Produces: stable local image paths referenced by Hero and social metadata.

- [ ] **Step 1: Write a failing SEO shell test**

```tsx
// src/seo.test.tsx
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('contains search and social metadata', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('<html lang="ru">');
  expect(html).toMatch(/<title>.*ЦЭ\/ЦТ.*русскому.*<\/title>/);
  expect(html).toContain('property="og:image" content="/og-image.jpg"');
});
```

- [ ] **Step 2: Run the SEO test and verify it fails**

Run: `cd octopus-landing && npm test -- --run src/seo.test.tsx`

Expected: FAIL because final metadata is absent.

- [ ] **Step 3: Create optimized local identity assets**

Download the exact approved Lyudmila photo, record its source URL in a comment in `prepare-media.sh`, and convert it to WebP at max width 960 with quality 82. Create a 1200×630 OG image using the established purple/lavender visual direction, the `49 BYN` offer, and Lyudmila's approved photo; keep all text inside the 1080×566 safe area. Create a simple original octopus favicon SVG using the site palette.

- [ ] **Step 4: Add metadata and verify**

Set Russian language, viewport, title, description, Open Graph title/description/image/type, and theme color. Run: `cd octopus-landing && npm test -- --run src/seo.test.tsx && npm run build:local`.

Expected: test PASS and build succeeds with all three assets in `dist/`.

- [ ] **Step 5: Commit SEO and identity assets**

```bash
git add octopus-landing/index.html octopus-landing/scripts/prepare-media.sh octopus-landing/public/media/lyudmila.webp octopus-landing/public/og-image.jpg octopus-landing/public/favicon.svg octopus-landing/src/seo.test.tsx
git commit -m "feat: add teacher imagery and landing metadata"
```

### Task 9: Add Browser-Level Responsive, Media, and Accessibility Tests

**Files:**
- Create: `octopus-landing/playwright.config.ts`
- Create: `octopus-landing/tests/landing.spec.ts`
- Create: `octopus-landing/tests/responsive.spec.ts`
- Create: `octopus-landing/tests/media.spec.ts`
- Modify: `octopus-landing/package.json`

**Interfaces:**
- Consumes: the complete static page and `VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot`.
- Produces: reproducible Chromium/WebKit mobile and desktop acceptance coverage.

- [ ] **Step 1: Write the failing conversion journey test**

```ts
// tests/landing.spec.ts
import { expect, test } from '@playwright/test';

test('every primary CTA points directly to the configured bot', async ({ page }) => {
  await page.goto('/');
  const links = page.getByRole('link', { name: /пройти тему|начать бесплатно/i });
  await expect(links).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(links.nth(index)).toHaveAttribute('href', /https:\/\/t\.me\/octopus_test_bot/);
  }
});
```

- [ ] **Step 2: Write responsive overflow and overlap tests**

For widths `[320, 360, 393, 430, 768, 1440]`, assert `document.documentElement.scrollWidth <= window.innerWidth`. At mobile widths, collect bounding boxes for hero heading, price, primary CTA, trial note, and teacher image; assert each box ends before the next begins. Capture full-page screenshots per viewport for review.

- [ ] **Step 3: Write media interaction tests**

Assert game previews have `muted`, `playsinline`, and no audio activation. Click one review, assert one visible dialog and one unmuted video; click a second review after closing and assert the first is paused. Test Escape and backdrop close, FAQ keyboard operation, and reduced-motion context where previews do not autoplay.

- [ ] **Step 4: Run tests and fix only acceptance failures**

Run: `cd octopus-landing && npx playwright install chromium webkit && VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm run test:e2e`

Expected: all Chromium and WebKit tests PASS at every configured viewport; screenshots show no overlapping content or square backgrounds behind review circles.

- [ ] **Step 5: Commit browser tests and resulting focused fixes**

```bash
git add octopus-landing/playwright.config.ts octopus-landing/tests octopus-landing/package.json octopus-landing/package-lock.json octopus-landing/src
git commit -m "test: verify responsive landing experience"
```

### Task 10: Perform Release Verification and Document the Publish Gate

**Files:**
- Create: `octopus-landing/README.md`
- Create: `octopus-landing/RELEASE_CHECKLIST.md`
- Modify: `octopus-landing/package.json`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: one verified static build and an explicit list of owner-supplied items still required for public release.

- [ ] **Step 1: Add the release verification script**

Add:

```json
{
  "scripts": {
    "verify": "npm test -- --run && npm run test:e2e && npm run build"
  }
}
```

Document local setup, media preparation, required environment variable, test commands, and static `dist/` deployment in `README.md`.

- [ ] **Step 2: Write the explicit publish gate**

`RELEASE_CHECKLIST.md` must use unchecked boxes for these owner actions: real Telegram bot URL; confirmed 49/199 BYN prices; confirmed free-week terms; post-31-August offer; Lyudmila fact/photo rights; seven review consents and transcripts; game-video rights; final privacy policy, offer, and legal details; analytics provider IDs. Technical boxes cover unit/E2E/build, real iOS/Android check, link check, console check, and Lighthouse targets.

- [ ] **Step 3: Run the complete verification with a safe test URL**

Run: `cd octopus-landing && VITE_TELEGRAM_BOT_URL=https://t.me/octopus_test_bot npm run verify`

Expected: unit tests PASS, browser tests PASS, TypeScript PASS, and Vite produces `dist/`.

- [ ] **Step 4: Inspect bundle and media output**

Run: `cd octopus-landing && du -h dist/assets/* | sort -h && find dist/media -type f -maxdepth 3 -print`

Expected: all referenced files exist, no HEVC/MOV sources are shipped, the first screen contains no video dependency, and media is isolated under `dist/media/` for caching.

- [ ] **Step 5: Run Lighthouse and record actual scores**

Start preview, run mobile Lighthouse for Performance, Accessibility, Best Practices, and SEO, then record the date and scores in `RELEASE_CHECKLIST.md`. Required before technical completion: Accessibility ≥90 and Best Practices ≥90; Performance target ≥85 after real-media optimization.

- [ ] **Step 6: Commit release documentation**

```bash
git add octopus-landing/README.md octopus-landing/RELEASE_CHECKLIST.md octopus-landing/package.json octopus-landing/package-lock.json
git commit -m "docs: add Octopus landing release checklist"
```
