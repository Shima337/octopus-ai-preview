import type { ReactNode } from 'react';
import { siteContent } from '../config/content';

type HeroProps = {
  cta: ReactNode;
};

export function Hero({ cta }: HeroProps) {
  const { aiPrice, teacher } = siteContent;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="section-shell">
        <header className="hero__topline">
          <div className="brand" aria-label="Осьминог">
            <span className="brand__mark" aria-hidden="true">О</span>
            <span>Осьминог</span>
          </div>
          <p className="hero__tag">русский без пробелов</p>
        </header>

        <div className="hero__layout">
          <div className="hero__copy">
            <div className="hero__intro">
              <span className="eyebrow">AI-репетитор по русскому</span>
              <h1 id="hero-title">Подготовься к <em>ЦЭ/ЦТ</em> по русскому</h1>
              <p className="hero__lead">
                Короткое объяснение, личная практика и проверка по каждой теме — в одном диалоге.
              </p>
              <p className="hero__method">
                По методике преподавателя с {teacher.experienceYears}-летним опытом подготовки.
              </p>
            </div>

            <div className="hero__offer" aria-label="Стоимость и бесплатный доступ">
              <p className="hero__price">
                {aiPrice} BYN <span>/ месяц</span>
              </p>
              <div className="hero__cta">{cta}</div>
              <p className="hero__note">Первая тема сейчас + 7 дней полного доступа бесплатно</p>
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero__portrait-frame">
              <img
                src="/media/lyudmila.webp"
                width="720"
                height="900"
                alt={`${teacher.name}, преподаватель русского языка`}
              />
            </div>
            <div className="teacher-card">
              <strong>{teacher.name}</strong>
              <span className="teacher-card__role">Автор методики подготовки</span>
              <span className="teacher-card__proof">
                {teacher.experienceYears} лет опыта<br />{teacher.hundredPointStudents} стобалльников
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
