import Image from "next/image";
import Link from "next/link";
import { getCachedFeaturedBrands, getCachedBrandProductCounts } from "@/lib/data/cached";
import { planBrandGrid, toBrandTile, formatProductCount } from "@/lib/brand-display";
import type { BrandTile } from "@/lib/brand-display";

// Static grid, no carousel: every tile is a destination, and a rotating
// one would hide half of them behind a timer.
//
// 5 columns on desktop, 3 on tablet, 2 on mobile -- matching the cap in
// planBrandGrid, which keeps the last row from ending half-empty at the two
// most common widths.
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4";

const tileClass =
  "transition-brand flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-[20px] border border-[var(--border)] bg-[var(--color-card)] px-3 py-4 text-center hover:border-[var(--color-warning)] hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]";

// Sized for the tallest thing a tile holds so a logo row and a wordmark row
// line up rather than each tile sizing to its own content.
const LOGO_BOX = "relative h-10 w-full";

function BrandTileContent({ tile }: { tile: BrandTile }) {
  return (
    <>
      {tile.mode === "logo" && tile.logoUrl ? (
        <span className={LOGO_BOX}>
          <Image
            src={tile.logoUrl}
            alt={tile.name}
            fill
            sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
            className="object-contain"
          />
        </span>
      ) : (
        // The wordmark: the brand's own name as styled text. This is what
        // every brand renders as by default, and the only thing Apple ever
        // renders as -- see lib/brand-display.ts for why that is enforced
        // in two places rather than left to whoever edits the row.
        <span className="font-heading flex h-10 items-center justify-center text-base leading-tight font-extrabold tracking-tight text-[#0F2D52] sm:text-lg">
          {tile.name}
        </span>
      )}
      <span className="text-xs text-[var(--muted)]">{formatProductCount(tile.productCount)}</span>
    </>
  );
}

export async function ShopByBrandSection() {
  const [brands, counts] = await Promise.all([
    getCachedFeaturedBrands(),
    getCachedBrandProductCounts(),
  ]);

  // A featured brand with nothing live to show would be a tile that leads
  // to an empty page, so it is dropped from the grid -- it still appears in
  // the /brands directory, which is a complete index rather than a
  // shopfront.
  const tiles = brands
    .map((brand) => toBrandTile(brand, counts[brand.id] ?? 0))
    .filter((tile) => tile.productCount > 0);

  if (tiles.length === 0) return null;

  const { tiles: shown, moreCount } = planBrandGrid(tiles);

  return (
    <section className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]">
      <div className="flex items-center justify-between gap-3">
        {/* Same heading treatment as the homepage's other section headers
            (app/page.tsx's SectionHeader) -- not that component itself,
            because its "View All" always points at a filtered listing,
            while this one points at the brand directory. */}
        <h2 className="font-heading min-w-0 text-base font-bold tracking-tight whitespace-nowrap sm:text-[28px] sm:font-extrabold md:text-[32px]">
          Shop by Brand
        </h2>
        <Link
          href="/brands"
          className="shrink-0 text-sm font-semibold underline-offset-2 hover:underline"
        >
          View all brands →
        </Link>
      </div>

      <div className={`mt-6 ${GRID}`}>
        {shown.map((tile) => (
          <Link key={tile.id} href={`/brand/${tile.slug}`} className={tileClass}>
            <BrandTileContent tile={tile} />
          </Link>
        ))}

        {moreCount > 0 && (
          // Occupies the last cell rather than being appended after the
          // grid, so the row count is unchanged whether or not it renders.
          <Link
            href="/brands"
            className={`${tileClass} border-dashed text-[#0F2D52]`}
            aria-label={`View all brands, including ${moreCount} more`}
          >
            <span className="font-heading flex h-10 items-center justify-center text-base font-extrabold tracking-tight sm:text-lg">
              +{moreCount} more
            </span>
            <span className="text-xs text-[var(--muted)]">View all brands</span>
          </Link>
        )}
      </div>
    </section>
  );
}
