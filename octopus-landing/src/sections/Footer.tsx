import { siteContent } from '../config/content';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="section-shell site-footer__inner">
        <div className="brand brand--footer" aria-label="Осьминог">
          <span className="brand__mark" aria-hidden="true">О</span>
          <span>Осьминог</span>
        </div>
        <nav className="site-footer__links" aria-label="Ссылки в подвале">
          <a href={siteContent.liveCourseUrl}>Основной сайт</a>
          <a href="/privacy.html">Политика конфиденциальности</a>
          <a href="/offer.html">Публичная оферта</a>
          <a href="/legal.html">Реквизиты</a>
        </nav>
      </div>
    </footer>
  );
}
