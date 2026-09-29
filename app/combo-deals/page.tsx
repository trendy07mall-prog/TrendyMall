import type { Metadata } from "next";
import Link from "next/link";
import { getCachedComboDeals } from "@/lib/data/cached";
import { ProductCard } from "@/components/product/ProductCard";
import { SITE_URL } from "@/lib/site";

// The "View All" destination for the homepage's Combo Deals strip.
//
// A dedicated page rather than the shop filtered to a category, because
// there is no bundle category to filter by: a bundle is filed under
// whatever category its contents belong to, and today's three sit in
// three different ones (Portable Speakers, Health & Beauty, Mobile
// Accessories). Forcing them into one would mean re-filing real
// products, and teaching /shop about product_kind would mean changing
// the shop's own query -- both far more invasive than this page, which
// reuses the homepage's existing data function and the same card.
//
// Shows exactly what the homepage strip shows, just without the cap:
// published bundles with stock above zero. That one condition is enough
// because sql/089 keeps a bundle's stock equal to what its contents
// allow and sql/091 drops it to 0 the moment anything inside cannot be
// sold, so nothing unbuyable can reach this page either.

// A ceiling rather than a page size: it exists so a runaway query can
// never try to render thousands of cards. A shop this size will not
// come close, and if it ever does, that is the moment to add paging.
const MAX = 60;

export const metadata: Metadata = {
  title: "Combo Deals",
  description:
    "Save more when you buy together. Product bundles from TrendyMall — two or more items sold as one, for less than buying them separately. Cash on Delivery and islandwide delivery in Sri Lanka.",
  alternates: { canonical: `${SITE_URL}/combo-deals` },
  openGraph: {
    title: "Combo Deals | TrendyMall",
    description: "Save more when you buy together — bundles for less than buying separately.",
    url: `${SITE_URL}/combo-deals`,
    type: "website",
  },
};

export default async function ComboDealsPage() {
  const bundles = await getCachedComboDeals(MAX);

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-10">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-[32px]">Combo Deals</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] sm:text-base">
          Save more when you buy together.
        </p>
      </header>

      {bundles.length === 0 ? (
        // Friendly rather than a bare "0 results": someone who clicked
        // through from the homepage arrived expecting bundles, so this
        // says plainly that there are none right now and gives them
        // somewhere to go instead of a dead end.
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] px-6 py-14 text-center">
          <p className="text-lg font-medium">No combo deals right now</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            We&apos;re putting new bundles together. In the meantime, everything in the shop is
            available on its own.
          </p>
          <Link
            href="/shop"
            className="transition-brand mt-6 inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
          >
            Shop all products
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-[var(--muted)]">
            {bundles.length} bundle{bundles.length === 1 ? "" : "s"} available
          </p>
          {/* The same grid and the same card as the shop and the
              homepage strip, so a bundle looks identical wherever it is
              seen -- including its square photo and "Save Rs X" badge. */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {bundles.map((product) => (
              <ProductCard key={product.id} product={product} variant="shop" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
