import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  pickFavouritesMode,
  qualifiesAsTopRated,
  sortTopRated,
  discountPercent,
  shortDescription,
  FAVOURITES_COPY,
  SECTION_MIN_PRODUCTS,
  TOP_RATED_MIN_RATING,
  TOP_RATED_MIN_REVIEWS,
} from "./customer-favourites";

describe("pickFavouritesMode", () => {
  test("enough top rated products: the section runs in Top Rated", () => {
    assert.equal(pickFavouritesMode(SECTION_MIN_PRODUCTS), "top_rated");
    assert.equal(pickFavouritesMode(12), "top_rated");
  });

  test("too few: it falls back to Best Sellers", () => {
    for (let count = 0; count < SECTION_MIN_PRODUCTS; count += 1) {
      assert.equal(pickFavouritesMode(count), "best_sellers");
    }
  });

  test("the boundary is inclusive -- exactly the minimum still counts", () => {
    assert.equal(pickFavouritesMode(SECTION_MIN_PRODUCTS - 1), "best_sellers");
    assert.equal(pickFavouritesMode(SECTION_MIN_PRODUCTS), "top_rated");
  });
});

describe("qualifiesAsTopRated", () => {
  test("meets both thresholds", () => {
    assert.equal(
      qualifiesAsTopRated({ avgRating: TOP_RATED_MIN_RATING, reviewCount: TOP_RATED_MIN_REVIEWS }),
      true,
    );
  });

  test("a great rating with no reviews does not qualify", () => {
    assert.equal(qualifiesAsTopRated({ avgRating: 5, reviewCount: 0 }), false);
  });

  test("plenty of reviews but a rating below the bar does not qualify", () => {
    assert.equal(qualifiesAsTopRated({ avgRating: 4.4, reviewCount: 50 }), false);
  });
});

describe("sortTopRated", () => {
  const p = (id: string, avgRating: number, reviewCount: number, createdAt: string) => ({
    id,
    avgRating,
    reviewCount,
    createdAt,
  });

  test("rating first", () => {
    const sorted = sortTopRated([p("a", 4.6, 100, "2026-01-01"), p("b", 4.9, 1, "2026-01-01")]);
    assert.deepEqual(sorted.map((x) => x.id), ["b", "a"]);
  });

  test("then review count", () => {
    const sorted = sortTopRated([p("a", 4.8, 2, "2026-01-01"), p("b", 4.8, 30, "2026-01-01")]);
    assert.deepEqual(sorted.map((x) => x.id), ["b", "a"]);
  });

  test("then the newest product", () => {
    const sorted = sortTopRated([p("old", 5, 3, "2025-01-01"), p("new", 5, 3, "2026-06-01")]);
    assert.deepEqual(sorted.map((x) => x.id), ["new", "old"]);
  });

  test("does not mutate its input", () => {
    const input = [p("a", 4.6, 1, "2026-01-01"), p("b", 5, 1, "2026-01-01")];
    const before = input.map((x) => x.id);
    sortTopRated(input);
    assert.deepEqual(input.map((x) => x.id), before);
  });
});

describe("discountPercent", () => {
  test("a real discount rounds to a whole percent", () => {
    assert.equal(discountPercent(3500, 1400), 60);
    assert.equal(discountPercent(1999, 725), 64);
  });

  test("no sale price is no discount", () => {
    assert.equal(discountPercent(1400, null), null);
  });

  test("a compare-at price equal to or below the sale price is not a discount", () => {
    assert.equal(discountPercent(1400, 1400), null);
    assert.equal(discountPercent(1000, 1400), null);
  });

  test("a zero or negative original price can never produce a percentage", () => {
    assert.equal(discountPercent(0, 0), null);
  });
});

describe("shortDescription", () => {
  test("prefers the admin-authored meta description", () => {
    assert.equal(
      shortDescription({ meta_description: "Crisp sound, all day.", description: "<p>Long copy</p>" }),
      "Crisp sound, all day.",
    );
  });

  test("falls back to the real description with HTML stripped and whitespace collapsed", () => {
    assert.equal(
      shortDescription({ meta_description: null, description: "<p>Great   <b>sound</b></p>" }),
      "Great sound",
    );
  });

  test("an empty meta description is ignored rather than shown as blank", () => {
    assert.equal(
      shortDescription({ meta_description: "   ", description: "<p>Real copy</p>" }),
      "Real copy",
    );
  });

  test("nothing to show at all returns null so the card can omit the line", () => {
    assert.equal(shortDescription({ meta_description: null, description: "" }), null);
    assert.equal(shortDescription({ meta_description: null, description: "<p> </p>" }), null);
  });

  test("long copy is truncated with an ellipsis", () => {
    const long = "word ".repeat(100);
    const out = shortDescription({ meta_description: null, description: long }, 40);
    assert.equal(out?.endsWith("…"), true);
    assert.ok((out?.length ?? 0) <= 41);
  });
});

describe("FAVOURITES_COPY", () => {
  test("each mode's heading, badge, link and aria label move together", () => {
    assert.equal(FAVOURITES_COPY.top_rated.heading, "Top Rated");
    assert.equal(FAVOURITES_COPY.top_rated.badge, "Top Rated");
    assert.equal(FAVOURITES_COPY.top_rated.href, "/shop?sort=highest_rated");
    assert.equal(FAVOURITES_COPY.top_rated.ariaLabel, "Top rated products");

    assert.equal(FAVOURITES_COPY.best_sellers.heading, "Best Sellers");
    assert.equal(FAVOURITES_COPY.best_sellers.badge, "Best Seller");
    assert.equal(FAVOURITES_COPY.best_sellers.href, "/shop?sort=best_selling");
    assert.equal(FAVOURITES_COPY.best_sellers.ariaLabel, "Best selling products");
  });

  test("the eyebrow is the same in both modes", () => {
    assert.equal(FAVOURITES_COPY.top_rated.eyebrow, "CUSTOMER FAVOURITES");
    assert.equal(FAVOURITES_COPY.best_sellers.eyebrow, FAVOURITES_COPY.top_rated.eyebrow);
  });
});
