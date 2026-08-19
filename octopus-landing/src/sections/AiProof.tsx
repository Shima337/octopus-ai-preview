import { SectionHeading } from '../components/SectionHeading';

export function AiProof() {
  return (
    <section className="ai-proof" aria-labelledby="ai-proof-title">
      <div className="section-shell">
        <SectionHeading
          id="ai-proof-title"
          eyebrow="AI, который действительно учит"
          title="Ошибка становится подсказкой"
          description="Репетитор определяет, где потерялась логика, объясняет иначе и проверяет понимание ещё раз."
        />

        <div className="ai-proof__layout">
          <div>
            <p className="ai-proof__statement">Не даёт готовый ответ — доводит до понимания</p>
            <div className="ai-proof__formats" aria-label="Форматы ответа">
              <span>Текст</span>
              <span>Варианты ответа</span>
              <span>Голос</span>
            </div>
          </div>

          <div className="chat" aria-label="Пример диалога ученика с AI-репетитором">
            <div className="chat__topbar">
              <span className="chat__status" aria-hidden="true" />
              AI-репетитор · на связи
            </div>
            <div className="chat__message chat__message--student">
              <small>Ученик</small>
              <p>Я написал «примирять платье». Почему это ошибка?</p>
            </div>
            <div className="chat__message">
              <small>AI-репетитор</small>
              <p>Ты выбрал гласную по звучанию. Но она безударная: сначала нужно определить значение корня.</p>
            </div>
            <div className="chat__message">
              <small>AI-репетитор</small>
              <p>«Примерять» связано с мерой и примеркой, а «примирять» — с миром. Какое слово подходит к платью?</p>
            </div>
            <div className="chat__message chat__message--student">
              <small>Ученик</small>
              <p>«Примерять»: я проверяю, подходит ли размер.</p>
            </div>
            <div className="chat__message">
              <small>AI-репетитор</small>
              <p>Верно. Дополнительное задание: выбери «посвятить» или «посветить» время учёбе и объясни значение.</p>
            </div>
            <div className="chat__message chat__message--student">
              <small>Ученик</small>
              <p>«Посвятить время учёбе»: здесь значение не связано со светом — я отдаю время занятию.</p>
            </div>
            <div className="chat__message chat__message--success">
              <small>AI-репетитор</small>
              <p>Ответ проверен: верно, «посвятить». Ты применил правило в новом примере — можно переходить к следующей теме.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
