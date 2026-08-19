import { ReviewGallery } from '../components/ReviewGallery';
import { SectionHeading } from '../components/SectionHeading';
import { siteContent } from '../config/content';

export function Reviews() {
  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <div className="section-shell">
        <SectionHeading
          id="reviews-title"
          eyebrow="Отзывы учеников"
          title="Они уже учатся с Осьминожкой"
          description="Нажмите на любое видео, чтобы услышать отзыв со звуком."
          align="center"
        />
        <ReviewGallery items={siteContent.reviews} />
      </div>
    </section>
  );
}
