import { MediaCarousel } from '../components/MediaCarousel';
import { SectionHeading } from '../components/SectionHeading';
import { TelegramCta } from '../components/TelegramCta';
import { siteContent } from '../config/content';

export function Games() {
  return (
    <section className="games" aria-labelledby="games-title">
      <div className="section-shell">
        <SectionHeading
          id="games-title"
          eyebrow="Практика без скуки"
          title="Правила превращаются в игры"
          description="После объяснения ученик закрепляет тему в короткой игре и сразу видит, что уже получается."
        />

        <MediaCarousel items={siteContent.games} ariaLabel="Примеры обучающих игр" />

        <div className="games__cta">
          <TelegramCta placement="games">Попробовать первую игру бесплатно</TelegramCta>
          <p>Начните в Telegram — установка приложения не нужна.</p>
        </div>
      </div>
    </section>
  );
}
