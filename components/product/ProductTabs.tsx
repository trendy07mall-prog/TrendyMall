"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/types";

type Tab = "description" | "specifications" | "shipping";

const TABS: { id: Tab; label: string }[] = [
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
  { id: "shipping", label: "Shipping" },
];

export function ProductTabs({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const [active, setActive] = useState<Tab>("description");

  return (
    <div className="mt-12">
      <div role="tablist" aria-label="Product information" className="flex gap-6 border-b border-[var(--border)]">
        {TABS.map((tab) => (
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
        className="py-6 text-sm whitespace-pre-line text-[var(--muted)]"
      >
        {product.description}
      </div>

      <div
        role="tabpanel"
        id="panel-specifications"
        aria-labelledby="tab-specifications"
        hidden={active !== "specifications"}
        className="py-6"
      >
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-[var(--border)] pb-2">
            <dt className="text-[var(--muted)]">Category</dt>
            <dd className="font-medium">{categoryName}</dd>
          </div>
          <div className="flex justify-between border-b border-[var(--border)] pb-2">
            <dt className="text-[var(--muted)]">Availability</dt>
            <dd className="font-medium">
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </dd>
          </div>
        </dl>
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
