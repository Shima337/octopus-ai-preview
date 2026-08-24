import type { ReactNode } from 'react';
import { siteContent } from '../config/content';
import { track, type AnalyticsEvent } from '../lib/analytics';
import { buildMarketingClickHref } from '../lib/marketingClick';

type TelegramPlacement = Extract<AnalyticsEvent, { name: 'telegram_cta_click' }>['placement'];

type TelegramCtaProps = {
  placement: TelegramPlacement;
  children: ReactNode;
  className?: string;
};

function getTelegramHref(placement: TelegramPlacement): string {
  const configuredUrl = siteContent.telegramUrl;

  try {
    const url = new URL(configuredUrl);
    const isHttpsBotLink = url.protocol === 'https:' && url.hostname === 't.me' && /^\/[A-Za-z0-9_]+\/?$/.test(url.pathname);
    const isTelegramDeepLink = url.protocol === 'tg:' && url.hostname === 'resolve' && /^[A-Za-z0-9_]+$/.test(url.searchParams.get('domain') ?? '');

    if (!isHttpsBotLink && !isTelegramDeepLink) {
      return buildMarketingClickHref(configuredUrl, window.location.search, placement);
    }

    const utmValues = ['utm_source', 'utm_medium', 'utm_campaign']
      .map((name) => new URLSearchParams(window.location.search).get(name))
      .filter((value): value is string => Boolean(value));
    const start = [placement, ...utmValues]
      .join('_')
      .replace(/[^A-Za-z0-9_-]/g, '-')
      .slice(0, 64);

    url.searchParams.set('start', start);
    return url.toString();
  } catch {
    return configuredUrl || '#telegram';
  }
}

export function TelegramCta({ placement, children, className }: TelegramCtaProps) {
  const href = getTelegramHref(placement);

  return (
    <a
      className={className}
      href={href}
      onClick={() => track({ name: 'telegram_cta_click', placement })}
    >
      {children}
    </a>
  );
}
