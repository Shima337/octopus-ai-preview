import { TelegramCta } from '../components/TelegramCta';
import { siteContent } from '../config/content';

export function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="section-shell final-cta__inner">
        <span className="eyebrow">Начни сейчас</span>
        <h2 id="final-cta-title">Пройди одну тему. Реши сам.</h2>
        <p>
          После бесплатной недели — {siteContent.aiPrice} BYN в месяц. Сегодня — 0 BYN.
        </p>
        <TelegramCta placement="final" className="final-cta__button">
          Запустить AI-репетитора
        </TelegramCta>
        <small>Без формы и банковской карты</small>
      </div>
    </section>
  );
}
