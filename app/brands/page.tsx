import Link from "next/link";
import type { Metadata } from "next";
import { getCachedBrandsAlphabetical, getCachedBrandProductCounts } from "@/lib/data/cached";
import { formatProductCount } from "@/lib/brand-display";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";

export const metadata: Metadata = {
  title: "All Brands",
  description:
    "Every brand stocked at TrendyMall — browse accessories by brand with islandwide delivery and cash on delivery across Sri Lanka.",
  alternates: { canonical: "/brands" },
};

// The complete index, not the shopfront: every ACTIVE brand, A-Z,
// regardless of is_featured and regardless of whether it currently has
// products. The homepage grid is the curated, product-bearing subset.
export default async function BrandsDirectoryPage() {
  const [brands, counts] = await Promise.all([
    getCachedBrandsAlphabetical(),
    getCachedBrandProductCounts(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />

      <h1 className="font-heading mt-4 text-2xl font-bold tracking-tight">All Brands</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Every brand we stock. Pick one to see just its products.
      </p>

      {brands.length === 0 ? (
        <p className="mt-8 text-[var(--muted)]">No brands have been added yet.</p>
      ) : (
        // A plain list, not the homepage's tile grid: a directory is read
        // by scanning names, and names read faster in a column than spread
        // across cards.
        <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/brand/${brand.slug}`}
                className="transition-brand flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--color-card)] px-4 py-3 hover:border-[var(--color-warning)]"
              >
                <span className="min-w-0 truncate font-semibold text-[#0F2D52]">{brand.name}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {formatProductCount(counts[brand.id] ?? 0)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
