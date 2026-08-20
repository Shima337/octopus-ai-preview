import type { CSSProperties } from 'react';
import { siteContent } from '../config/content';

const footerLinkTarget: CSSProperties = {
  display: 'inline-flex',
  minWidth: 44,
  minHeight: 44,
  alignItems: 'center',
};

export function Footer() {
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
          <a href="/privacy.html" style={footerLinkTarget}>
            Политика конфиденциальности
          </a>
          <a href="/offer.html" style={footerLinkTarget}>
            Публичная оферта
          </a>
          <a href="/legal.html" style={footerLinkTarget}>
            Реквизиты
          </a>
        </nav>
      </div>
    </footer>
  );
}
