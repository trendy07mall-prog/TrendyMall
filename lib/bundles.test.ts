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
