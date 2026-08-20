import { describe, expect, it } from 'vitest';
import { withBasePath } from './assetPath';

describe('withBasePath', () => {
  it('keeps local root paths stable', () => {
    expect(withBasePath('/media/games/game-01.mp4', '/')).toBe('/media/games/game-01.mp4');
  });

  it('prefixes static assets for a GitHub Pages project site', () => {
    expect(withBasePath('/media/games/game-01.mp4', '/octopus-ai-preview/'))
      .toBe('/octopus-ai-preview/media/games/game-01.mp4');
    expect(withBasePath('/privacy.html', '/octopus-ai-preview/'))
      .toBe('/octopus-ai-preview/privacy.html');
  });
});
