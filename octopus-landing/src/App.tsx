import { siteContent } from './config/content';
import { AiProof } from './sections/AiProof';
import { Hero } from './sections/Hero';
import { TopicJourney } from './sections/TopicJourney';

function App() {
  return (
    <main className="page-shell">
      <Hero
        cta={(
          <a href={siteContent.telegramUrl || '#telegram'}>
            Пройти тему бесплатно
          </a>
        )}
      />
      <TopicJourney />
      <AiProof />
    </main>
  );
}

export default App;
