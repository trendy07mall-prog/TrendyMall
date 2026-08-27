"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SpecsTable } from "@/components/product/SpecsTable";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import type { Product, ProductRatingSummary } from "@/types";
import type { ReviewWithReviewerName } from "@/lib/reviews";
import type { DisplaySpec } from "@/lib/data/spec-templates";

type Tab = "description" | "specifications" | "reviews" | "shipping";

export function ProductTabs({
  product,
  categoryName,
  specs,
  reviews,
  ratingSummary,
  reviewState,
}: {
  product: Product;
  categoryName: string;
  specs: DisplaySpec[];
  reviews: ReviewWithReviewerName[];
  ratingSummary: ProductRatingSummary | null;
  reviewState: "can_review" | "already_reviewed" | "not_logged_in";
}) {
  const [active, setActive] = useState<Tab>("description");
  // ?review=<id> deep link (see CustomerReviews.tsx on the homepage) --
  // reviews are already all rendered up front (getProductReviews has no
  // pagination today, confirmed before building this), just hidden on
  // whichever tab isn't active, so switching tabs is the only "load" step
  // needed before the target row actually has layout to scroll to.
  const searchParams = useSearchParams();
  const reviewId = searchParams.get("review");

  useEffect(() => {
    // Syncing to an external signal (the URL's own ?review= param) -- same
    // class of exception as the localStorage/matchMedia-read effects
    // elsewhere in this app.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reviewId) setActive("reviews");
  }, [reviewId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${ratingSummary?.review_count ?? 0})` },
    { id: "shipping", label: "Shipping" },
  ];

  return (
    <div className="mt-10 max-w-[820px]">
      <div
        role="tablist"
        aria-label="Product information"
        className="flex gap-6 overflow-x-auto border-b border-[var(--border)]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`-mb-px shrink-0 border-b-2 px-1 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
              active === tab.id
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-b-[var(--radius-lg)] border border-t-0 border-[var(--border)] bg-[var(--color-card)]">
        <div
          role="tabpanel"
          id="panel-description"
          aria-labelledby="tab-description"
          hidden={active !== "description"}
          className="prose-editor p-6 text-sm text-[var(--muted)]"
          // Sanitized server-side (sanitize-html) before it was ever
          // stored — see lib/admin/products.ts.
          dangerouslySetInnerHTML={{ __html: product.description }}
        />

        <div
          role="tabpanel"
          id="panel-specifications"
          aria-labelledby="tab-specifications"
          hidden={active !== "specifications"}
          className="p-6"
        >
          <SpecsTable product={product} categoryName={categoryName} specs={specs} />
        </div>

        <div
          role="tabpanel"
          id="panel-reviews"
          aria-labelledby="tab-reviews"
          hidden={active !== "reviews"}
          className="p-6"
        >
          <ReviewsSection
            productId={product.id}
            reviews={reviews}
            ratingSummary={ratingSummary}
            reviewState={reviewState}
            highlightReviewId={active === "reviews" ? reviewId : null}
          />
        </div>

        <div
          role="tabpanel"
          id="panel-shipping"
          aria-labelledby="tab-shipping"
          hidden={active !== "shipping"}
          className="p-6 text-sm text-[var(--muted)]"
        >
          <p>
            Colombo 1–15 delivers in 1–2 working days; other areas in 2–4 working days. Cash on
            Delivery is available across Sri Lanka.
          </p>
          <p className="mt-2">
            See our full{" "}
            <Link href="/shipping" className="underline">
              Shipping Policy
            </Link>{" "}
            and{" "}
            <Link href="/returns" className="underline">
              Returns &amp; Refunds Policy
            </Link>{" "}
            for details.
          </p>
        </div>
      </div>
    </div>
  );
}
