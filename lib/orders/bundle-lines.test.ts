import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contentsLineLabel,
  customerVisibleLineCount,
  groupBundleLines,
  groupBundleRows,
  hasBundleLines,
} from "./bundle-lines";

// The shape create_order_atomic writes for a bundle: the priced line
// first, then its contents at zero, in sort_order.
const BUNDLE_ID = "bundle-1";
const BUNDLE_LINE = { productId: BUNDLE_ID, bundleId: null, name: "Travel Kit", subtotal: 1690 };
const INSIDE_A = { productId: "p-earbuds", bundleId: BUNDLE_ID, name: "Earbuds", subtotal: 0 };
const INSIDE_B = { productId: "p-cable", bundleId: BUNDLE_ID, name: "Cable", subtotal: 0 };
const NORMAL = { productId: "p-shirt", bundleId: null, name: "Shirt", subtotal: 2400 };

test("an order with no bundles is one group per line, unchanged", () => {
  const groups = groupBundleLines([NORMAL, { ...NORMAL, productId: "p-cap", name: "Cap" }]);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((g) => g.contents.length),
    [0, 0],
  );
  assert.equal(groups[0].line.name, "Shirt");
});

test("an order placed before bundles existed still groups correctly", () => {
  // Those rows have no bundleId key at all, not even null.
  const legacy = [{ productId: "p-old", name: "Legacy" }, { productId: "p-old2", name: "Legacy 2" }];
  const groups = groupBundleLines(legacy);
  assert.equal(groups.length, 2);
  assert.equal(hasBundleLines(legacy), false);
});

test("contents sit under their bundle, not beside it", () => {
  const groups = groupBundleLines([BUNDLE_LINE, INSIDE_A, INSIDE_B]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].line.name, "Travel Kit");
  assert.deepEqual(
    groups[0].contents.map((c) => c.name),
    ["Earbuds", "Cable"],
  );
});

test("the bundle keeps the money and the contents carry none", () => {
  const groups = groupBundleLines([BUNDLE_LINE, INSIDE_A, INSIDE_B]);
  assert.equal(groups[0].line.subtotal, 1690);
  assert.deepEqual(
    groups[0].contents.map((c) => c.subtotal),
    [0, 0],
  );
});

test("a bundle and a normal product in the same order stay separate", () => {
  const groups = groupBundleLines([BUNDLE_LINE, INSIDE_A, INSIDE_B, NORMAL]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].contents.length, 2);
  assert.equal(groups[1].line.name, "Shirt");
  assert.equal(groups[1].contents.length, 0);
});

test("order is preserved when the normal product comes first", () => {
  const groups = groupBundleLines([NORMAL, BUNDLE_LINE, INSIDE_A]);
  assert.deepEqual(
    groups.map((g) => g.line.name),
    ["Shirt", "Travel Kit"],
  );
  assert.equal(groups[1].contents.length, 1);
});

test("two different bundles in one order do not mix their contents", () => {
  const second = { productId: "bundle-2", bundleId: null, name: "Desk Kit", subtotal: 900 };
  const insideSecond = { productId: "p-mousepad", bundleId: "bundle-2", name: "Mousepad", subtotal: 0 };
  const groups = groupBundleLines([BUNDLE_LINE, INSIDE_A, second, insideSecond]);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups[0].contents.map((c) => c.name),
    ["Earbuds"],
  );
  assert.deepEqual(
    groups[1].contents.map((c) => c.name),
    ["Mousepad"],
  );
});

test("an orphaned contents line is shown, never silently dropped", () => {
  // Its bundle line is missing. Hiding it would mean an item vanishing
  // from a packing slip, so it is promoted to a line of its own.
  const groups = groupBundleLines([NORMAL, INSIDE_A]);
  assert.equal(groups.length, 2);
  assert.equal(groups[1].line.name, "Earbuds");
});

test("contents still attach when the rows arrive in any order", () => {
  // Every row of one order shares the same created_at (now() is fixed
  // for the transaction), so a query with no tie-break can return the
  // contents before their bundle. That must not strand an item.
  const groups = groupBundleLines([INSIDE_A, BUNDLE_LINE, INSIDE_B]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].line.name, "Travel Kit");
  assert.deepEqual(
    groups[0].contents.map((c) => c.name),
    ["Earbuds", "Cable"],
  );
});

test("a fully reversed row order gives the same grouping", () => {
  const forwards = groupBundleLines([BUNDLE_LINE, INSIDE_A, INSIDE_B, NORMAL]);
  const backwards = groupBundleLines([NORMAL, INSIDE_B, INSIDE_A, BUNDLE_LINE]);
  assert.equal(forwards.length, backwards.length);
  // Same two purchases in both, each with its contents attached.
  assert.equal(
    forwards.find((g) => g.line.name === "Travel Kit")!.contents.length,
    backwards.find((g) => g.line.name === "Travel Kit")!.contents.length,
  );
  assert.equal(backwards.find((g) => g.line.name === "Shirt")!.contents.length, 0);
});

test("every line put in comes back out exactly once", () => {
  // The invariant that matters for a packing slip: nothing duplicated,
  // nothing lost, whatever the input order.
  for (const input of [
    [BUNDLE_LINE, INSIDE_A, INSIDE_B, NORMAL],
    [INSIDE_B, NORMAL, BUNDLE_LINE, INSIDE_A],
    [NORMAL, INSIDE_A, INSIDE_B],
  ]) {
    const groups = groupBundleLines(input);
    const out = groups.flatMap((g) => [g.line, ...g.contents]);
    assert.equal(out.length, input.length);
    for (const line of input) assert.equal(out.filter((o) => o === line).length, 1);
  }
});

test("nothing in, nothing out", () => {
  assert.deepEqual(groupBundleLines([]), []);
  assert.equal(customerVisibleLineCount([]), 0);
  assert.equal(hasBundleLines([]), false);
});

test("a bundle counts as one purchase, not one per item inside", () => {
  assert.equal(customerVisibleLineCount([BUNDLE_LINE, INSIDE_A, INSIDE_B]), 1);
  assert.equal(customerVisibleLineCount([BUNDLE_LINE, INSIDE_A, INSIDE_B, NORMAL]), 2);
  assert.equal(customerVisibleLineCount([NORMAL]), 1);
});

test("hasBundleLines only fires when a contents line is present", () => {
  assert.equal(hasBundleLines([NORMAL, { ...NORMAL, productId: "p-2" }]), false);
  // A bundle with no contents rows is indistinguishable from a normal
  // product here, and that is correct: there is nothing to indent.
  assert.equal(hasBundleLines([BUNDLE_LINE]), false);
  assert.equal(hasBundleLines([BUNDLE_LINE, INSIDE_A]), true);
});

test("the contents label reads the same everywhere it is written as text", () => {
  assert.equal(contentsLineLabel("Earbuds", 1), "Earbuds");
  assert.equal(contentsLineLabel("Earbuds", 2), "Earbuds × 2");
  assert.equal(contentsLineLabel("Earbuds", 1, "Black"), "Earbuds (Black)");
  assert.equal(contentsLineLabel("Earbuds", 3, "Black"), "Earbuds (Black) × 3");
  // A quantity of one is not written out, so a single-item line does not
  // read "x 1" on an invoice.
  assert.ok(!contentsLineLabel("Cable", 1).includes("×"));
});

// ── the snake_case spelling, used by the admin pages and the PDFs ──────

const DB_BUNDLE = { id: "1", product_id: BUNDLE_ID, bundle_id: null, product_name: "Travel Kit" };
const DB_INSIDE = { id: "2", product_id: "p-earbuds", bundle_id: BUNDLE_ID, product_name: "Earbuds" };
const DB_NORMAL = { id: "3", product_id: "p-shirt", bundle_id: null, product_name: "Shirt" };

test("database rows group exactly as the camelCase ones do", () => {
  const groups = groupBundleRows([DB_BUNDLE, DB_INSIDE, DB_NORMAL]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].line.product_name, "Travel Kit");
  assert.deepEqual(
    groups[0].contents.map((c) => c.product_name),
    ["Earbuds"],
  );
  assert.equal(groups[1].line.product_name, "Shirt");
});

test("grouping database rows returns the original row objects, untouched", () => {
  const groups = groupBundleRows([DB_BUNDLE, DB_INSIDE]);
  // Identity matters: the callers go on to read id, subtotal, image and
  // the rest off these, so the adapter must not hand back copies.
  assert.equal(groups[0].line, DB_BUNDLE);
  assert.equal(groups[0].contents[0], DB_INSIDE);
});

test("database rows from before bundles existed have no bundle_id key", () => {
  const legacy = [{ id: "9", product_id: "p-old", product_name: "Legacy" }];
  const groups = groupBundleRows(legacy);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].contents.length, 0);
});
