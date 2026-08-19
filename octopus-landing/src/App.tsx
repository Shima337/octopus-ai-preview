import { AiProof } from './sections/AiProof';
import { Games } from './sections/Games';
import { Hero } from './sections/Hero';
import { Reviews } from './sections/Reviews';
import { TopicJourney } from './sections/TopicJourney';

function App() {
  return (
    <main className="page-shell">
      <Hero />
      <TopicJourney />
      <AiProof />
      <Games />
      <Reviews />
    </main>
  );
}

export default App;
