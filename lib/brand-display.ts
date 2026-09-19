import type { Brand } from "@/types";

// How a brand tile renders, and what the homepage grid shows. Pure so the
// trademark-safety rule and the "+N more" arithmetic are unit-testable
// without a database or a render.

export interface BrandTile {
  id: string;
  name: string;
  slug: string;
  // "wordmark" renders the name as styled text; "logo" renders logoUrl.
  mode: "logo" | "wordmark";
  logoUrl: string | null;
  productCount: number;
}

// TRADEMARK SAFETY. A brand renders pictorially only when BOTH conditions
// hold: someone deliberately set display_style to "logo", AND there is
// actually an image to render. Everything else -- the default, a row still
// on "wordmark", a row flipped to "logo" but with no upload yet -- renders
// the name as text.
//
// The practical effect asked for: uploading a logo file for a brand is NOT
// on its own enough to make it render. Apple in particular restricts
// pictorial-logo use to authorised resellers, so its row stays "wordmark"
// and an image arriving later (by upload, import, or hand-edited row)
// changes nothing on its own. The database default in sql/078 says the same
// thing; this is the second of the two places that have to agree before a
// logo is ever painted.
export function brandTileMode(brand: Pick<Brand, "display_style" | "image_path">): "logo" | "wordmark" {
  return brand.display_style === "logo" && Boolean(brand.image_path) ? "logo" : "wordmark";
}

export function toBrandTile(brand: Brand, productCount: number): BrandTile {
  const mode = brandTileMode(brand);
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    mode,
    // Null unless the tile is genuinely rendering as a logo, so a caller
    // can't accidentally paint an image the mode rule just rejected.
    logoUrl: mode === "logo" ? brand.image_path : null,
    productCount,
  };
}

export interface BrandGridPlan {
  tiles: BrandTile[];
  // How many featured brands did not fit. 0 = everything is on screen and
  // no "+N more" tile is rendered.
  moreCount: number;
}

// The homepage grid is 5 columns on desktop, 3 on tablet, 2 on mobile, so
// the cap is a multiple of both 5 and 2 to avoid a half-empty final row at
// the two most common widths. When there are more featured brands than fit,
// the last cell becomes the "+N more" tile rather than a brand -- so the
// total number of cells is still exactly `maxTiles`, never one more.
const DEFAULT_MAX_TILES = 10;

export function planBrandGrid(featured: BrandTile[], maxTiles = DEFAULT_MAX_TILES): BrandGridPlan {
  if (featured.length <= maxTiles) return { tiles: featured, moreCount: 0 };
  const tiles = featured.slice(0, maxTiles - 1);
  return { tiles, moreCount: featured.length - tiles.length };
}

// Thin-content guard. A brand page with almost nothing on it is worth less
// than no page at all in search, so it is noindexed -- but it still renders
// and still works for anyone who clicks through from the grid or the
// directory. Deliberately counts live products only, the same predicate
// every other product count in this app uses.
export const THIN_BRAND_PRODUCT_THRESHOLD = 2;

export function shouldNoindexBrand(productCount: number): boolean {
  return productCount <= THIN_BRAND_PRODUCT_THRESHOLD;
}

// "1 product" / "12 products" -- the count under each tile and in the
// directory. Separated out so the grid and the directory can never drift
// into different wording.
export function formatProductCount(count: number): string {
  return `${count} ${count === 1 ? "product" : "products"}`;
}
