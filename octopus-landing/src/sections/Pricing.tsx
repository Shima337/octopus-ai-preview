import { SectionHeading } from '../components/SectionHeading';
import { TelegramCta } from '../components/TelegramCta';
import { siteContent } from '../config/content';
import { track } from '../lib/analytics';
import { isPromoActive } from '../lib/promo';

type PricingProps = {
  now?: Date;
};

export function Pricing({ now = new Date() }: PricingProps) {
  const promoIsActive = isPromoActive(now, siteContent.promoDeadline);

  return (
    <section className="pricing" aria-labelledby="pricing-title">
      <div className="section-shell">
        <SectionHeading
          id="pricing-title"
          eyebrow="Выбери формат"
          title="Начни самостоятельно или приходи на живой курс"
          description="В обоих форматах ты готовишься по методике Людмилы Ершовой."
          align="center"
        />

        <div className="pricing__grid">
          <article className="price-card price-card--primary">
            <p className="price-card__label">AI-репетитор</p>
            <h3>Весь курс в твоём темпе</h3>
            <p className="price-card__price">
              {siteContent.aiPrice} BYN <span>/ месяц</span>
            </p>
            <p className="price-card__trial">7 дней бесплатно</p>
            <ul className="price-card__features">
              <li>Видео и объяснения по темам</li>
              <li>Личная практика, игры и тесты</li>
              <li>Голосовые ответы и контроль прогресса</li>
            </ul>
            <TelegramCta placement="pricing" className="price-card__cta">
              Попробовать бесплатно
            </TelegramCta>
            <p className="price-card__today">Сегодня 0 BYN</p>
          </article>

          <article className="price-card price-card--secondary">
            <p className="price-card__label">Живой курс</p>
            <h3>Занятия с Людмилой</h3>
            <p className="price-card__price">
              {siteContent.livePrice} BYN <span>/ месяц</span>
            </p>
            <p className="price-card__description">
              Занятия с преподавателем и закрепление материала с AI-репетитором.
            </p>
            {promoIsActive ? <p className="price-card__promo">{siteContent.liveCoursePromo}</p> : null}
            <a
              className="price-card__cta price-card__cta--outline"
              href={siteContent.liveCourseUrl}
              onClick={() => track({ name: 'live_course_click' })}
            >
              Узнать о живом курсе
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
