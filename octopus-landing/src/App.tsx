import { AiProof } from './sections/AiProof';
import { Hero } from './sections/Hero';
import { TopicJourney } from './sections/TopicJourney';

function App() {
  return (
    <main className="page-shell">
      <Hero />
      <TopicJourney />
      <AiProof />
    </main>
  );
}

export default App;
