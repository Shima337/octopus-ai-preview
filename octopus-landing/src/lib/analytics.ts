export type AnalyticsEvent =
  | { name: 'telegram_cta_click'; placement: 'hero' | 'games' | 'pricing' | 'final' }
  | { name: 'live_course_click' }
  | { name: 'game_slide_change'; id: string }
  | { name: 'review_open' | 'review_complete'; id: string }
  | { name: 'faq_open'; id: string };

declare global {
  interface Window {
    dataLayer?: { push(event: AnalyticsEvent): unknown };
  }
}

export function track(event: AnalyticsEvent): void {
  window.dispatchEvent(new CustomEvent('octopus:analytics', { detail: event }));
  window.dataLayer?.push(event);
}
