import { test } from "node:test";
import assert from "node:assert/strict";
import type { Campaign } from "@/types";
import { resolveFooterCategories, resolveFooterShopLinks } from "./footer-links";

// The seven categories the footer should link, as the live database has
// them today: active, not noindexed, and holding stock.
const LIVE = [
  { slug: "earbuds", is_active: true },
  { slug: "headsets-headphones", is_active: true },
  { slug: "earphones", is_active: true },
  { slug: "portable-speakers", is_active: true },
  { slug: "power-bank", is_active: true },
  { slug: "trimmers-groomers-clippers", is_active: true },
  { slug: "electronic", is_active: true },
  // Noindexed or empty ones, which must never appear.
  { slug: "mobile-accessories", is_active: true },
  { slug: "speakers", is_active: true },
  { slug: "mouse", is_active: true },
  { slug: "digital-goods", is_active: true },
  { slug: "watches", is_active: true },
];

const WITH_PRODUCTS = new Set([
  "earbuds",
  "headsets-headphones",
  "earphones",
  "portable-speakers",
  "power-bank",
  "trimmers-groomers-clippers",
  "electronic",
  "mobile-accessories",
  "speakers",
  "mouse",
]);

const campaign = (over: Partial<Campaign> = {}) =>
  ({ slug: "big-bang-flash-sale", name: "Big Bang Flash Sale", ...over }) as Campaign;

test("links exactly the seven indexable categories, in order", () => {
  const out = resolveFooterCategories(LIVE, WITH_PRODUCTS);
  assert.deepEqual(
    out.map((l) => l.href),
    [
      "/category/earbuds",
      "/category/headsets-headphones",
      "/category/earphones",
      "/category/portable-speakers",
      "/category/power-bank",
      "/category/trimmers-groomers-clippers",
      "/category/electronic",
    ],
  );
});

test("never links a noindexed category", () => {
  const hrefs = resolveFooterCategories(LIVE, WITH_PRODUCTS).map((l) => l.href);
  for (const slug of ["mobile-accessories", "speakers", "mouse", "digital-goods", "watches"]) {
    assert.ok(!hrefs.includes(`/category/${slug}`), `${slug} must not be linked`);
  }
});

test("drops a category that has been deactivated", () => {
  const out = resolveFooterCategories(
    LIVE.map((c) => (c.slug === "power-bank" ? { ...c, is_active: false } : c)),
    WITH_PRODUCTS,
  );
  assert.ok(!out.some((l) => l.href === "/category/power-bank"));
  assert.equal(out.length, 6);
});

test("drops a category that no longer exists", () => {
  const out = resolveFooterCategories(
    LIVE.filter((c) => c.slug !== "earbuds"),
    WITH_PRODUCTS,
  );
  assert.ok(!out.some((l) => l.href === "/category/earbuds"));
});

test("drops a category that has run out of products", () => {
  const thinned = new Set(WITH_PRODUCTS);
  thinned.delete("trimmers-groomers-clippers");
  const out = resolveFooterCategories(LIVE, thinned);
  assert.ok(!out.some((l) => l.href === "/category/trimmers-groomers-clippers"));
});

test("an empty database yields no category links rather than dead ones", () => {
  assert.deepEqual(resolveFooterCategories([], new Set()), []);
});

test("labels are shopper wording, not raw category names", () => {
  const out = resolveFooterCategories(LIVE, WITH_PRODUCTS);
  const byHref = new Map(out.map((l) => [l.href, l.label]));
  assert.equal(byHref.get("/category/headsets-headphones"), "Headphones");
  assert.equal(byHref.get("/category/portable-speakers"), "Bluetooth Speakers");
  assert.equal(byHref.get("/category/electronic"), "Electronics & Audio");
  // No label carries a third-party brand name.
  for (const label of byHref.values()) {
    assert.ok(!/airpod|apple|marshall|jbl|magsafe/i.test(label), label);
  }
});

test("shop links include the campaign only while one is running", () => {
  const withOne = resolveFooterShopLinks([campaign()]);
  assert.deepEqual(withOne.at(-1), {
    href: "/campaign/big-bang-flash-sale",
    label: "Big Bang Flash Sale",
  });

  const withNone = resolveFooterShopLinks([]);
  assert.equal(withNone.length, 4);
  assert.ok(!withNone.some((l) => l.href.startsWith("/campaign/")));
});

test("shop links always offer the four fixed destinations", () => {
  assert.deepEqual(
    resolveFooterShopLinks([]).map((l) => l.href),
    ["/shop", "/new-arrivals", "/shop?collection=best-sellers", "/combo-deals"],
  );
});

test("only the soonest-ending campaign is linked", () => {
  const out = resolveFooterShopLinks([
    campaign({ slug: "ends-first", name: "Ends First" }),
    campaign({ slug: "ends-later", name: "Ends Later" }),
  ]);
  assert.equal(out.filter((l) => l.href.startsWith("/campaign/")).length, 1);
  assert.equal(out.at(-1)?.href, "/campaign/ends-first");
});

test("a campaign missing a slug or name is skipped, not rendered broken", () => {
  assert.equal(resolveFooterShopLinks([campaign({ slug: "" })]).length, 4);
  assert.equal(resolveFooterShopLinks([campaign({ name: "" })]).length, 4);
});

test("survives a cache entry of the wrong shape instead of 500ing the site", () => {
  // unstable_cache serialises to JSON and persists across deploys, so an
  // entry written by an older build can come back as a bare object. The
  // footer is in the root layout: a throw here takes down every page.
  const asObject = {} as unknown as Iterable<string>;
  assert.deepEqual(resolveFooterCategories(LIVE, asObject), []);
  assert.deepEqual(resolveFooterCategories(null as never, WITH_PRODUCTS), []);
  assert.equal(resolveFooterShopLinks(null as never).length, 4);
  assert.equal(resolveFooterShopLinks({} as never).length, 4);
});

test("accepts a plain array of slugs, which is what the cache returns", () => {
  const out = resolveFooterCategories(LIVE, [...WITH_PRODUCTS]);
  assert.equal(out.length, 7);
});
