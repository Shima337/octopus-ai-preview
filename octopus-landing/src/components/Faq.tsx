import { useState } from 'react';
import { siteContent } from '../config/content';
import { track } from '../lib/analytics';

export function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggleItem(id: string) {
    const willOpen = openId !== id;
    setOpenId(willOpen ? id : null);
    if (willOpen) track({ name: 'faq_open', id });
  }

  return (
    <section className="faq" aria-labelledby="faq-title">
      <div className="section-shell faq__layout">
        <header className="faq__heading">
          <span className="eyebrow">Коротко о важном</span>
          <h2 id="faq-title">Частые вопросы</h2>
          <p>Если ответа не хватит, Осьминожка поможет разобраться прямо в Telegram.</p>
        </header>

        <div className="faq__list">
          {siteContent.faq.map((item) => {
            const isOpen = openId === item.id;
            const questionId = `faq-question-${item.id}`;
            const answerId = `faq-answer-${item.id}`;

            return (
              <article className={`faq__item${isOpen ? ' faq__item--open' : ''}`} key={item.id}>
                <h3>
                  <button
                    id={questionId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span>{item.question}</span>
                    <span className="faq__icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                </h3>
                {isOpen ? (
                  <div
                    className="faq__answer"
                    id={answerId}
                    role="region"
                    aria-labelledby={questionId}
                  >
                    <p>{item.answer}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
