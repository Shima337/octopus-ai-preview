import { describe, expect, it } from 'vitest';
import { buildMarketingClickHref, type LandingCta } from './marketingClick';

const configuredUrl = 'https://web.ct-bratan.by/api/marketing/click?funnel=learning_path';

function params(search: string, placement: LandingCta = 'hero') {
  return new URL(buildMarketingClickHref(configuredUrl, search, placement)).searchParams;
}

describe('buildMarketingClickHref', () => {
  it('forwards every supported arrival attribution field', () => {
    const arrival = new URLSearchParams({
      utm_source: 'instagram',
      utm_medium: 'paid_social',
      utm_campaign: 'august',
      utm_content: 'video_2',
      utm_term: 'russian tutor',
      fbclid: 'fb-click',
      ttclid: 'tt-click',
      gclid: 'google-click',
      campaign_id: 'campaign-7',
      adset_id: 'adset-8',
      ad_id: 'ad-9',
      creative_id: 'creative-10',
      placement: 'instagram_story',
    });

    expect(Object.fromEntries(params(`?${arrival.toString()}`))).toEqual({
      funnel: 'learning_path',
      ...Object.fromEntries(arrival),
      landing_surface: 'octopus_ai',
      landing_cta: 'hero',
    });
  });

  it.each<LandingCta>(['hero', 'games', 'pricing', 'final'])(
    'adds the trusted %s CTA dimension',
    (placement) => {
      expect(params('', placement).get('landing_cta')).toBe(placement);
    },
  );

  it('preserves configured selectors and ignores untrusted or unknown arrival params', () => {
    const result = params(
      '?funnel=other&landing_surface=spoofed&landing_cta=spoofed&unknown=value&utm_source=tiktok',
      'games',
    );

    expect(Object.fromEntries(result)).toEqual({
      funnel: 'learning_path',
      utm_source: 'tiktok',
      landing_surface: 'octopus_ai',
      landing_cta: 'games',
    });
  });

  it('uses the first repeated value, omits empty values, and keeps URL encoding valid', () => {
    const result = params('?utm_source=Tik%20Tok&utm_source=ignored&utm_medium=&utm_campaign=%D0%B0%D0%B2%D0%B3%D1%83%D1%81%D1%82');

    expect(result.getAll('utm_source')).toEqual(['Tik Tok']);
    expect(result.has('utm_medium')).toBe(false);
    expect(result.get('utm_campaign')).toBe('август');
  });

  it('adds only landing dimensions for a direct visit', () => {
    expect(Object.fromEntries(params(''))).toEqual({
      funnel: 'learning_path',
      landing_surface: 'octopus_ai',
      landing_cta: 'hero',
    });
  });
});
