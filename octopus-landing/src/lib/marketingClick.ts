export const marketingAttributionParams = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'ttclid',
  'gclid',
  'campaign_id',
  'adset_id',
  'ad_id',
  'creative_id',
  'placement',
] as const;

export type LandingCta = 'hero' | 'games' | 'pricing' | 'final';

export function buildMarketingClickHref(
  configuredUrl: string,
  pageSearch: string,
  placement: LandingCta,
): string {
  try {
    const url = new URL(configuredUrl);
    const isMarketingClick = url.protocol === 'https:' && url.pathname === '/api/marketing/click';

    if (!isMarketingClick) return configuredUrl || '#telegram';

    const arrivalParams = new URLSearchParams(pageSearch);
    for (const name of marketingAttributionParams) {
      const value = arrivalParams.get(name)?.trim();
      if (value) url.searchParams.set(name, value);
    }

    url.searchParams.set('landing_surface', 'octopus_ai');
    url.searchParams.set('landing_cta', placement);
    return url.toString();
  } catch {
    return configuredUrl || '#telegram';
  }
}
