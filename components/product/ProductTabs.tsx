"use client";

import { useState } from "react";
import Link from "next/link";
import { SpecsTable } from "@/components/product/SpecsTable";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import type { Product, ProductRatingSummary } from "@/types";
import type { ReviewWithReviewerName } from "@/lib/reviews";

type Tab = "description" | "specifications" | "reviews" | "shipping";

export function ProductTabs({
  product,
  categoryName,
  reviews,
  ratingSummary,
  reviewState,
}: {
  product: Product;
  categoryName: string;
  reviews: ReviewWithReviewerName[];
  ratingSummary: ProductRatingSummary | null;
  reviewState: "can_review" | "already_reviewed" | "not_logged_in";
}) {
  const [active, setActive] = useState<Tab>("description");

  const tabs: { id: Tab; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews (${ratingSummary?.review_count ?? 0})` },
    { id: "shipping", label: "Shipping" },
  ];

  return (
    <div className="mt-12">
      <div role="tablist" aria-label="Product information" className="flex gap-6 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
              active === tab.id
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="panel-description"
        aria-labelledby="tab-description"
        hidden={active !== "description"}
        className="prose-editor py-6 text-sm text-[var(--muted)]"
        // Sanitized server-side (sanitize-html) before it was ever
        // stored — see lib/admin/products.ts.
        dangerouslySetInnerHTML={{ __html: product.description }}
      />

      <div
        role="tabpanel"
        id="panel-specifications"
        aria-labelledby="tab-specifications"
        hidden={active !== "specifications"}
        className="py-6"
      >
        <SpecsTable product={product} categoryName={categoryName} />
      </div>

      <div
        role="tabpanel"
        id="panel-reviews"
        aria-labelledby="tab-reviews"
        hidden={active !== "reviews"}
        className="py-6"
      >
        <ReviewsSection
          productId={product.id}
          reviews={reviews}
          ratingSummary={ratingSummary}
          reviewState={reviewState}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-shipping"
        aria-labelledby="tab-shipping"
        hidden={active !== "shipping"}
        className="py-6 text-sm text-[var(--muted)]"
      >
        <p>
          Standard islandwide delivery takes 3–5 business days. Cash on
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
  );
}
