import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  brandTileMode,
  toBrandTile,
  planBrandGrid,
  shouldNoindexBrand,
  formatProductCount,
} from "./brand-display";
import type { Brand } from "@/types";

const brand = (over: Partial<Brand> & { name: string; slug: string }): Brand =>
  ({
    id: over.slug,
    description: null,
    image_path: null,
    display_style: "wordmark",
    is_featured: true,
    sort_order: 0,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  }) as Brand;

describe("brandTileMode", () => {
  test("the default row renders as a wordmark", () => {
    assert.equal(brandTileMode({ display_style: "wordmark", image_path: null }), "wordmark");
  });

  test("a logo renders only when it is both opted into AND present", () => {
    assert.equal(brandTileMode({ display_style: "logo", image_path: "/logo.png" }), "logo");
  });

  test("opted into logo but nothing uploaded falls back to the wordmark", () => {
    assert.equal(brandTileMode({ display_style: "logo", image_path: null }), "wordmark");
  });

  // The trademark-safety rule, stated as a test rather than only as a
  // comment: an image arriving for a brand that was never switched to
  // "logo" must not start rendering that image.
  test("an uploaded image does NOT on its own make a brand render pictorially", () => {
    assert.equal(brandTileMode({ display_style: "wordmark", image_path: "/apple.png" }), "wordmark");
  });

  test("Apple: a logo file appearing later changes nothing while it stays a wordmark", () => {
    const apple = brand({ name: "Apple", slug: "apple", image_path: "/uploads/apple-logo.png" });
    const tile = toBrandTile(apple, 2);
    assert.equal(tile.mode, "wordmark");
    // ...and the URL is not even handed to the renderer, so it cannot be
    // painted by mistake.
    assert.equal(tile.logoUrl, null);
  });
});

describe("toBrandTile", () => {
  test("carries the logo through only for a genuine logo tile", () => {
    const withLogo = brand({
      name: "Lenovo",
      slug: "lenovo",
      display_style: "logo",
      image_path: "/lenovo.png",
    });
    assert.deepEqual(toBrandTile(withLogo, 2), {
      id: "lenovo",
      name: "Lenovo",
      slug: "lenovo",
      mode: "logo",
      logoUrl: "/lenovo.png",
      productCount: 2,
    });
  });
});

describe("planBrandGrid", () => {
  const tiles = (n: number) =>
    Array.from({ length: n }, (_, i) => toBrandTile(brand({ name: `B${i}`, slug: `b${i}` }), 1));

  test("everything fits: no overflow tile", () => {
    const plan = planBrandGrid(tiles(10), 10);
    assert.equal(plan.tiles.length, 10);
    assert.equal(plan.moreCount, 0);
  });

  test("fewer brands than the cap is still no overflow tile", () => {
    assert.equal(planBrandGrid(tiles(4), 10).moreCount, 0);
  });

  test("one too many: the last cell becomes '+N more', so the cell count is unchanged", () => {
    const plan = planBrandGrid(tiles(11), 10);
    assert.equal(plan.tiles.length, 9);
    assert.equal(plan.moreCount, 2);
    // 9 brand tiles + 1 overflow tile = the cap, not the cap + 1.
    assert.equal(plan.tiles.length + 1, 10);
  });

  test("the live catalogue's 12 featured brands: 9 shown, +3 more", () => {
    const plan = planBrandGrid(tiles(12), 10);
    assert.equal(plan.tiles.length, 9);
    assert.equal(plan.moreCount, 3);
  });

  test("no featured brands at all is an empty plan, not an error", () => {
    assert.deepEqual(planBrandGrid([], 10), { tiles: [], moreCount: 0 });
  });

  test("order is preserved -- the caller's sort_order is what the grid shows", () => {
    const plan = planBrandGrid(tiles(12), 10);
    assert.deepEqual(plan.tiles.map((t) => t.slug).slice(0, 3), ["b0", "b1", "b2"]);
  });
});

describe("shouldNoindexBrand", () => {
  test("0, 1 and 2 products are thin and get noindexed", () => {
    for (const count of [0, 1, 2]) assert.equal(shouldNoindexBrand(count), true);
  });

  test("3 or more is indexable", () => {
    for (const count of [3, 4, 20]) assert.equal(shouldNoindexBrand(count), false);
  });
});

describe("formatProductCount", () => {
  test("singular for exactly one", () => {
    assert.equal(formatProductCount(1), "1 product");
  });

  test("plural for none and for many", () => {
    assert.equal(formatProductCount(0), "0 products");
    assert.equal(formatProductCount(7), "7 products");
  });
});
