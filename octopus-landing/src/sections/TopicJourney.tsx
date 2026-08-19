import { SectionHeading } from '../components/SectionHeading';

const topicStages = [
  {
    title: 'Видеообъяснение',
    detail: 'Разбираем правило за 2–3 минуты — коротко и на понятных примерах.',
  },
  {
    title: 'Личная практика с AI',
    detail: 'Отвечаешь в своём темпе, а репетитор замечает причину каждой ошибки.',
  },
  {
    title: 'Игра по правилу',
    detail: 'Закрепляешь тему в игровом формате, чтобы правило осталось в памяти.',
  },
  {
    title: 'Тест по теме',
    detail: 'Проверяешь навык на заданиях в формате экзамена.',
  },
  {
    title: 'Следующий уровень',
    detail: 'После успеха открывается новая тема. Если есть ошибки — AI вернёт к объяснению и практике.',
  },
];

export function TopicJourney() {
  return (
    <section className="journey" aria-labelledby="journey-title">
      <div className="section-shell">
        <SectionHeading
          id="journey-title"
          eyebrow="Одна тема — один маршрут"
          title="От правила до уверенного ответа"
          description="Не просто смотришь урок: проходишь пять последовательных уровней и видишь, что действительно понял тему."
        />

        <ol className="journey__list" aria-label="Пять этапов изучения темы">
          {topicStages.map((stage, index) => (
            <li className="journey__stage" key={stage.title}>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.detail}</p>
                {index === 4 ? <span className="sr-only">Тема завершена</span> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
