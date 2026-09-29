import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bundleAvailability,
  bundleProfit,
  bundleSaving,
  bundleSavingPercent,
  bundleSeparateTotal,
  effectiveUnitPrice,
  isBundleInStock,
  selectComboDeals,
} from "./bundles";

// The worked example from the brief: Earbuds + Cable + Case, Rs 1,950
// separately, sold together for Rs 1,690.
const EARBUDS = { regularPrice: 1200, salePrice: null, quantity: 1 };
const CABLE = { regularPrice: 450, salePrice: null, quantity: 1 };
const CASE = { regularPrice: 300, salePrice: null, quantity: 1 };
const EXAMPLE = [EARBUDS, CABLE, CASE];

test("the advertised saving is the real difference", () => {
  assert.equal(bundleSeparateTotal(EXAMPLE), 1950);
  assert.equal(bundleSaving(1950, 1690), 260);
  assert.equal(bundleSavingPercent(1950, 1690), 13);
});

test("a sale price on an item counts as what you would have paid", () => {
  // If the cable is already discounted to 400, the honest "before" price
  // is 400, not 450 -- otherwise the bundle claims a saving the customer
  // could have had anyway.
  const onSale = [EARBUDS, { regularPrice: 450, salePrice: 400, quantity: 1 }, CASE];
  assert.equal(effectiveUnitPrice({ regularPrice: 450, salePrice: 400 }), 400);
  assert.equal(bundleSeparateTotal(onSale), 1900);
  assert.equal(bundleSaving(1900, 1690), 210);
});

test("quantity inside the bundle is multiplied, not ignored", () => {
  const twoCables = [EARBUDS, { ...CABLE, quantity: 2 }, CASE];
  assert.equal(bundleSeparateTotal(twoCables), 1200 + 900 + 300);
});

test("a bundle priced above its parts advertises no saving, not a negative one", () => {
  assert.equal(bundleSaving(1950, 2100), 0);
  assert.equal(bundleSavingPercent(1950, 2100), 0);
});

// ── availability: the rule that decides "Out of stock" ──

test("availability is the lowest item, not the highest or the average", () => {
  const items = [
    { productStock: 50, variantStock: 50, quantity: 1 },
    { productStock: 3, variantStock: 3, quantity: 1 }, // the limiting one
    { productStock: 20, variantStock: 20, quantity: 1 },
  ];
  assert.equal(bundleAvailability(items), 3);
  assert.equal(isBundleInStock(items), true);
});

test("ONE item running out makes the whole bundle out of stock", () => {
  const items = [
    { productStock: 50, variantStock: 50, quantity: 1 },
    { productStock: 0, variantStock: 0, quantity: 1 },
    { productStock: 20, variantStock: 20, quantity: 1 },
  ];
  assert.equal(bundleAvailability(items), 0);
  assert.equal(isBundleInStock(items), false);
});

test("needing 2 of an item halves how many bundles are possible", () => {
  // 5 in stock, 2 per bundle -> 2 bundles, not 5 and not 2.5.
  assert.equal(bundleAvailability([{ productStock: 5, variantStock: 5, quantity: 2 }]), 2);
  assert.equal(bundleAvailability([{ productStock: 1, variantStock: 1, quantity: 2 }]), 0);
});

test("the lower of the two stock numbers wins", () => {
  // create_order_atomic reduces BOTH the product and the option, so the
  // real limit is whichever is smaller.
  assert.equal(bundleAvailability([{ productStock: 10, variantStock: 2, quantity: 1 }]), 2);
  assert.equal(bundleAvailability([{ productStock: 2, variantStock: 10, quantity: 1 }]), 2);
});

test("an option that does not track its own stock falls back to the product", () => {
  assert.equal(bundleAvailability([{ productStock: 7, variantStock: null, quantity: 1 }]), 7);
});

test("negative stock in the data cannot produce a negative availability", () => {
  assert.equal(bundleAvailability([{ productStock: -5, variantStock: -5, quantity: 1 }]), 0);
  assert.equal(isBundleInStock([{ productStock: -5, variantStock: null, quantity: 1 }]), false);
});

test("a bundle with nothing in it is never sellable", () => {
  assert.equal(bundleAvailability([]), 0);
  assert.equal(isBundleInStock([]), false);
});

// ── profit: admin-only, and honest about missing data ──

test("profit is the bundle price minus what the items cost to buy", () => {
  const costs = [
    { cost: 700, quantity: 1 },
    { cost: 250, quantity: 1 },
    { cost: 150, quantity: 1 },
  ];
  assert.equal(bundleProfit(1690, costs), 590);
});

test("profit counts cost per unit times quantity", () => {
  assert.equal(bundleProfit(1000, [{ cost: 200, quantity: 3 }]), 400);
});

test("a missing cost gives no profit figure at all, rather than a wrong one", () => {
  // Treating an unknown cost as 0 would report a profit far higher than
  // reality, and it would read as fact in the admin form.
  const partial = [
    { cost: 700, quantity: 1 },
    { cost: null, quantity: 1 },
  ];
  assert.equal(bundleProfit(1690, partial), null);
});

test("a bundle sold below cost reports the loss rather than hiding it", () => {
  assert.equal(bundleProfit(500, [{ cost: 700, quantity: 1 }]), -200);
});

// ── the SQL/TS parity contract ─────────────────────────────────────────
// bundle_available_units() in sql/089 must return exactly what
// bundleAvailability() returns here -- the database writes its answer
// into products.stock, and the cart, checkout, reorder and every stock
// filter then trust that number. If the two ever disagree, the shop
// would show one thing and sell another.
//
// These are the exact scenarios sql/090 asserts against the real
// database. Changing an expected number here without changing it there
// (or the other way round) is the drift this test exists to catch.

test("parity with sql/090: the option's stock is the limit, not the product's", () => {
  // Item A in sql/090: product 50, option 10, 1 per bundle -> 10
  assert.equal(bundleAvailability([{ productStock: 50, variantStock: 10, quantity: 1 }]), 10);
});

test("parity with sql/090: an option tracking no stock follows its product", () => {
  // Item C in sql/090: product 9, option null -> 9, then product 3 -> 3
  assert.equal(bundleAvailability([{ productStock: 9, variantStock: null, quantity: 1 }]), 9);
  assert.equal(bundleAvailability([{ productStock: 3, variantStock: null, quantity: 1 }]), 3);
});

test("parity with sql/090: 7 in stock at 2 per bundle is 3 bundles", () => {
  assert.equal(bundleAvailability([{ productStock: 7, variantStock: 7, quantity: 2 }]), 3);
});

test("parity with sql/090: one item at zero empties the whole bundle", () => {
  // Zero, not a negative: products_stock_check and
  // product_variants_stock_check both require >= 0, so negative stock
  // cannot exist in this database. The guard for it above is belt and
  // braces, and sql/090 deliberately does not test it, because it cannot.
  assert.equal(
    bundleAvailability([
      { productStock: 50, variantStock: 10, quantity: 1 },
      { productStock: 7, variantStock: 0, quantity: 1 },
    ]),
    0,
  );
});

test("parity with sql/090: restocking that item brings the bundle back", () => {
  assert.equal(
    bundleAvailability([
      { productStock: 50, variantStock: 10, quantity: 1 },
      { productStock: 7, variantStock: 7, quantity: 1 },
    ]),
    7,
  );
});

test("parity with sql/090: after an order of 3, the bundle reports 7", () => {
  // sql/090 orders 3 bundles of a 1-item bundle whose option had 10 left.
  assert.equal(bundleAvailability([{ productStock: 50, variantStock: 7, quantity: 1 }]), 7);
});

test("parity with sql/087: A(10) and B(7 at 2 per bundle) allow 3, then 1, then 3", () => {
  const at = (a: number, b: number) =>
    bundleAvailability([
      { productStock: a, variantStock: a, quantity: 1 },
      { productStock: b, variantStock: b, quantity: 2 },
    ]);
  assert.equal(at(10, 7), 3); // before any order
  assert.equal(at(8, 3), 1); // after 2 bundles are sold
  assert.equal(at(10, 7), 3); // after the order is cancelled
});

test("parity with sql/090: an empty bundle can sell nothing", () => {
  assert.equal(bundleAvailability([]), 0);
});

// ── an item that cannot be sold at all ─────────────────────────────────
// Not a stock question: the product has been unpublished, soft-deleted,
// or the exact option the bundle pins has been switched off since the
// bundle was built. The bundle's own status says nothing about that, so
// this is the rule that stops a bundle being sold when it could not be
// honoured. sql/091 enforces the identical rule in the database.

const PLENTY = { productStock: 100, variantStock: 100, quantity: 1 };

test("one unsellable item makes the whole bundle unavailable", () => {
  assert.equal(
    bundleAvailability([PLENTY, { ...PLENTY, isSellable: false }]),
    0,
    "an unpublished item must empty the bundle however much stock the others have",
  );
});

test("an unsellable item wins even when it has stock of its own", () => {
  // The trap this guards: the item is fully stocked, so a stock-only
  // rule would happily sell a bundle containing a product nobody can buy.
  assert.equal(bundleAvailability([{ productStock: 999, variantStock: 999, quantity: 1, isSellable: false }]), 0);
});

test("isSellable true behaves exactly as leaving it out", () => {
  assert.equal(bundleAvailability([{ ...PLENTY, isSellable: true }]), bundleAvailability([PLENTY]));
});

test("a healthy bundle is unaffected by the new rule", () => {
  assert.equal(
    bundleAvailability([
      { productStock: 50, variantStock: 10, quantity: 1, isSellable: true },
      { productStock: 7, variantStock: 7, quantity: 2, isSellable: true },
    ]),
    3,
  );
});

test("republishing the item brings the bundle straight back", () => {
  const items = (sellable: boolean) => [PLENTY, { ...PLENTY, variantStock: 9, isSellable: sellable }];
  assert.equal(bundleAvailability(items(false)), 0);
  assert.equal(bundleAvailability(items(true)), 9);
});

test("isBundleInStock agrees with availability about unsellable items", () => {
  assert.equal(isBundleInStock([PLENTY, { ...PLENTY, isSellable: false }]), false);
  assert.equal(isBundleInStock([PLENTY, { ...PLENTY, isSellable: true }]), true);
});

// ── the homepage "Combo Deals" strip ───────────────────────────────────

const deal = (stock: number, separate: number | null, price: number, tag = "") => ({
  stock,
  bundleSeparateTotal: separate,
  price,
  tag,
});

test("an out-of-stock bundle is left out of Combo Deals entirely", () => {
  // Not greyed out: a section called "Combo Deals" whose first card says
  // "Out of stock" is worse than no section at all.
  const picked = selectComboDeals([deal(0, 2400, 2300, "gone"), deal(5, 2400, 2300, "here")], 5);
  assert.deepEqual(
    picked.map((d) => d.tag),
    ["here"],
  );
});

test("a bundle blocked by an unpublished item is left out too", () => {
  // sql/091 makes such a bundle read 0, so the same one check covers it.
  assert.deepEqual(selectComboDeals([deal(0, 2400, 2300)], 5), []);
});

test("the biggest saving comes first", () => {
  const picked = selectComboDeals(
    [deal(5, 2400, 2300, "saves100"), deal(5, 3000, 2000, "saves1000"), deal(5, 2600, 2300, "saves300")],
    5,
  );
  assert.deepEqual(
    picked.map((d) => d.tag),
    ["saves1000", "saves300", "saves100"],
  );
});

test("the strip never shows more than it has room for", () => {
  const many = Array.from({ length: 12 }, (_, i) => deal(5, 3000, 3000 - i * 10, `d${i}`));
  assert.equal(selectComboDeals(many, 8).length, 8);
  assert.equal(selectComboDeals(many, 0).length, 0);
});

test("nothing available means an empty list, so the section can hide", () => {
  // This is the whole mechanism behind "never show an empty section".
  assert.deepEqual(selectComboDeals([], 8), []);
  assert.deepEqual(selectComboDeals([deal(0, 2400, 2300), deal(0, 900, 800)], 8), []);
});

test("a bundle with no saving still appears, it just sorts last", () => {
  // Published and in stock, so it is a real thing a customer can buy;
  // hiding it would be a silent catalogue gap. The card simply shows no
  // badge (bundleSaving is never negative).
  const picked = selectComboDeals([deal(5, 2000, 2500, "nosaving"), deal(5, 3000, 2000, "real")], 5);
  assert.deepEqual(
    picked.map((d) => d.tag),
    ["real", "nosaving"],
  );
});

test("a bundle whose separate total is unknown does not crash the sort", () => {
  const picked = selectComboDeals([deal(5, null, 2300, "unknown"), deal(5, 3000, 2000, "real")], 5);
  assert.deepEqual(
    picked.map((d) => d.tag),
    ["real", "unknown"],
  );
});
