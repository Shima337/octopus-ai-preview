import type { CSSProperties } from 'react';
import { siteContent } from '../config/content';
import { assetPath } from '../lib/assetPath';

const footerLinkTarget: CSSProperties = {
  display: 'inline-flex',
  minWidth: 44,
  minHeight: 44,
  alignItems: 'center',
};

export function Footer() {
  const isPublicPreview = import.meta.env.VITE_PUBLIC_PREVIEW === 'true';
  const legalItems = [
    { href: assetPath('/privacy.html'), label: 'Политика конфиденциальности' },
    { href: assetPath('/offer.html'), label: 'Публичная оферта' },
    { href: assetPath('/legal.html'), label: 'Реквизиты' },
  ];

  return (
    <footer className="site-footer">
      <div className="section-shell site-footer__inner">
        <div className="brand brand--footer" aria-label="Осьминог">
          <span className="brand__mark" aria-hidden="true">О</span>
          <span>Осьминог</span>
        </div>
        <nav className="site-footer__links" aria-label="Ссылки в подвале">
          <a href={siteContent.liveCourseUrl} style={footerLinkTarget}>
            Основной сайт
          </a>
          {legalItems.map((item) => (
            isPublicPreview
              ? <span key={item.href}>{item.label}</span>
              : <a href={item.href} style={footerLinkTarget} key={item.href}>{item.label}</a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
