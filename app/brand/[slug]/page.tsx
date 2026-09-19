import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import {
  getCachedBrandBySlug,
  getCachedBrandProductCounts,
  getCachedBrandsAlphabetical,
  getCachedProductsByBrand,
} from "@/lib/data/cached";
import { brandTileMode, shouldNoindexBrand, formatProductCount } from "@/lib/brand-display";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/product/Breadcrumbs";

// Every brand slug is known at build time and they change only when an
// admin adds or renames a brand, so the route's params are enumerated here
// rather than discovered per request.
//
// NOTE: no `export const revalidate`. The grid below shows live prices and
// stock, and an ISR window would both hold them stale and ignore the
// products cache tag that every other grid on this site responds to. The
// freshness policy lives in the cached readers instead (lib/data/cached.ts):
// brand rows under the categories tag, the product grid under the products
// tag with the same 5-minute backstop /shop and /category use.
export async function generateStaticParams() {
  const brands = await getCachedBrandsAlphabetical();
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getCachedBrandBySlug(slug);
  if (!brand || !brand.is_active) return { title: "Brand not found" };

  const counts = await getCachedBrandProductCounts();
  const productCount = counts[brand.id] ?? 0;
  const title = `${brand.name} Accessories in Sri Lanka | TrendyMall`;
  const description =
    brand.description ??
    `Shop ${brand.name} accessories at TrendyMall — ${formatProductCount(productCount)} available with islandwide delivery and cash on delivery.`;

  return {
    // The template in the root layout would append the site name a second
    // time, so this opts out of it with an absolute title.
    title: { absolute: title },
    description,
    alternates: { canonical: `/brand/${brand.slug}` },
    // Thin-content guard: a page with two products or fewer is worth less
    // than no page at all in search. It still renders and still works for
    // anyone arriving from the grid or the directory -- this only keeps it
    // out of the index.
    ...(shouldNoindexBrand(productCount) ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: `/brand/${brand.slug}`,
    },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getCachedBrandBySlug(slug);
  if (!brand || !brand.is_active) notFound();

  const [products, counts] = await Promise.all([
    getCachedProductsByBrand(brand.id, { sort: "newest" }),
    getCachedBrandProductCounts(),
  ]);
  const mode = brandTileMode(brand);

  return (
    <div className="mx-auto w-full max-w-[var(--container-width)] flex-1 px-6 py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Brands", href: "/brands" },
          { label: brand.name },
        ]}
      />

      <header className="mt-4">
        {mode === "logo" && brand.image_path ? (
          <span className="relative block h-12 w-48">
            <Image
              src={brand.image_path}
              alt={brand.name}
              fill
              sizes="192px"
              className="object-contain object-left"
            />
          </span>
        ) : (
          // The wordmark. Also the <h1>, so the page has a real heading
          // whichever way the brand renders.
          <h1 className="font-heading text-2xl font-bold tracking-tight">{brand.name}</h1>
        )}
        {mode === "logo" && <h1 className="sr-only">{brand.name}</h1>}

        {brand.description && (
          <p className="mt-2 max-w-2xl text-[var(--muted)]">{brand.description}</p>
        )}
        <p className="mt-2 text-sm text-[var(--muted)]">
          {formatProductCount(counts[brand.id] ?? 0)}
        </p>
      </header>

      <div className="mt-8">
        {/* The same grid /shop, /category and /search render -- not a
            brand-specific copy -- so cards, pricing, badges and the
            list/grid view toggle all behave identically here. */}
        <ProductGrid
          products={products}
          emptyMessage={`No ${brand.name} products are available right now.`}
        />
      </div>
    </div>
  );
}
