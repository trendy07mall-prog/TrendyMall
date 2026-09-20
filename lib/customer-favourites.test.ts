import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  pickFavouritesMode,
  qualifiesAsTopRated,
  sortTopRated,
  discountPercent,
  reviewQuote,
  reviewerFirstName,
  parseCollection,
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

describe("reviewQuote", () => {
  test("plain text passes through", () => {
    assert.equal(reviewQuote("Great sound for the price"), "Great sound for the price");
  });

  test("HTML is stripped and whitespace collapsed", () => {
    assert.equal(reviewQuote("<b>Great</b>   sound" + String.fromCharCode(10, 10) + "here"), "Great sound here");
  });

  test("nothing to show returns null so the line is omitted", () => {
    assert.equal(reviewQuote(null), null);
    assert.equal(reviewQuote(""), null);
    assert.equal(reviewQuote("   "), null);
    assert.equal(reviewQuote("<p> </p>"), null);
  });

  // Real data hit this: a review comment pasted in from a formatted source
  // arrived full of markdown, which would otherwise have printed literally.
  test("markdown emphasis is stripped, not printed", () => {
    assert.equal(reviewQuote("**AirPods Pro** deliver rich sound"), "AirPods Pro deliver rich sound");
    assert.equal(reviewQuote("_really_ `good` ~stuff~"), "really good stuff");
  });

  test("markdown links keep their label and drop the URL", () => {
    assert.equal(reviewQuote("See [the specs](https://example.com) here"), "See the specs here");
  });

  test("reference-style link definitions are dropped entirely", () => {
    const out = reviewQuote("Great sound" + String.fromCharCode(10) + "[1]: https://example.com \"Title\"");
    assert.equal(out, "Great sound");
  });

  test("heading, quote and list markers are stripped", () => {
    assert.equal(reviewQuote("> Premium sound"), "Premium sound");
    assert.equal(reviewQuote("## Great" + String.fromCharCode(10) + "- crisp"), "Great crisp");
  });

  test("long quotes are truncated with an ellipsis", () => {
    const out = reviewQuote("x".repeat(300), 40);
    assert.equal(out?.length, 41);
    assert.equal(out?.endsWith("…"), true);
  });
});

describe("reviewerFirstName", () => {
  test("takes only the first name, never the surname", () => {
    assert.equal(reviewerFirstName("Fathima Rizwan"), "Fathima");
    assert.equal(reviewerFirstName("  Nuwan   Perera  "), "Nuwan");
  });

  test("no name available returns null so the card omits it", () => {
    assert.equal(reviewerFirstName(null), null);
    assert.equal(reviewerFirstName(""), null);
    assert.equal(reviewerFirstName("   "), null);
  });

  test("an e-mail or phone number is never printed as a name", () => {
    assert.equal(reviewerFirstName("someone@example.com"), null);
    assert.equal(reviewerFirstName("0771234567"), null);
    assert.equal(reviewerFirstName("+94 77 123 4567"), null);
  });
});

describe("parseCollection", () => {
  test("recognises both collection slugs", () => {
    assert.equal(parseCollection("top-rated"), "top_rated");
    assert.equal(parseCollection("best-sellers"), "best_sellers");
  });

  test("is forgiving about case and surrounding space", () => {
    assert.equal(parseCollection("  Top-Rated "), "top_rated");
  });

  test("an unknown or missing value is ignored, not an error", () => {
    assert.equal(parseCollection("xyz"), null);
    assert.equal(parseCollection(""), null);
    assert.equal(parseCollection(undefined), null);
    assert.equal(parseCollection(null), null);
  });
});

describe("FAVOURITES_COPY", () => {
  test("each mode's heading, badge, link and aria label move together", () => {
    assert.equal(FAVOURITES_COPY.top_rated.heading, "Top Rated");
    assert.equal(FAVOURITES_COPY.top_rated.badge, "Top Rated");
    assert.equal(FAVOURITES_COPY.top_rated.href, "/shop?collection=top-rated");
    assert.equal(FAVOURITES_COPY.top_rated.ariaLabel, "Top rated products");

    assert.equal(FAVOURITES_COPY.best_sellers.heading, "Best Sellers");
    assert.equal(FAVOURITES_COPY.best_sellers.badge, "Best Seller");
    assert.equal(FAVOURITES_COPY.best_sellers.href, "/shop?collection=best-sellers");
    assert.equal(FAVOURITES_COPY.best_sellers.ariaLabel, "Best selling products");
  });

  test("the eyebrow is the same in both modes", () => {
    assert.equal(FAVOURITES_COPY.top_rated.eyebrow, "CUSTOMER FAVOURITES");
    assert.equal(FAVOURITES_COPY.best_sellers.eyebrow, FAVOURITES_COPY.top_rated.eyebrow);
  });
});
