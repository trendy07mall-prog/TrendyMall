import Link from "next/link";
import { getFeaturedReviews } from "@/lib/reviews";
import { StarRating } from "@/components/product/StarRating";
import { FadeIn } from "@/components/motion/FadeIn";

// Only ever real, approved reviews from the reviews table — never
// placeholder/fabricated testimonials. Renders nothing at all if there
// aren't any yet, rather than shipping an empty or fake-looking section.
export async function CustomerReviews() {
  const reviews = await getFeaturedReviews(6);
  if (reviews.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]">
      <FadeIn>
        <h2 className="font-heading text-center text-[32px] font-extrabold tracking-tight">
          What Our Customers Say
        </h2>
      </FadeIn>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review, index) => (
          <FadeIn key={review.id} delay={index * 0.05}>
            <div className="flex h-full flex-col gap-3 rounded-[18px] border border-[var(--border)] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1">
              <StarRating rating={review.rating} size="sm" />
              {review.title && <h3 className="text-sm font-semibold">{review.title}</h3>}
              <p className="line-clamp-4 flex-1 text-sm text-[var(--muted)]">{review.comment}</p>
              <div className="text-xs text-[var(--color-text-secondary)]">
                <span className="font-medium text-[var(--foreground)]">{review.reviewerName}</span>
                {" · "}
                <Link href={`/product/${review.productSlug}`} className="hover:underline">
                  {review.productName}
                </Link>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
