import { AiProof } from './sections/AiProof';
import { Faq } from './components/Faq';
import { FinalCta } from './sections/FinalCta';
import { Footer } from './sections/Footer';
import { Games } from './sections/Games';
import { Hero } from './sections/Hero';
import { Pricing } from './sections/Pricing';
import { Reviews } from './sections/Reviews';
import { TopicJourney } from './sections/TopicJourney';

function App() {
  return (
    <>
      <main className="page-shell">
        <Hero />
        <Reviews />
        <TopicJourney />
        <AiProof />
        <Games />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

export default App;
