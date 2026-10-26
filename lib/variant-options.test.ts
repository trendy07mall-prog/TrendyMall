import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanColorName,
  colorKey,
  findVariant,
  isValueUnavailable,
  selectOption,
  variantSummary,
  type OptionVariant,
} from "./variant-options";

// Colour x Mah x Connector, with 10000 + Lighting never made and Blue 10000
// sold out -- the same shape as the mockup.
function powerBank(): (OptionVariant & { id: string })[] {
  const rows: (OptionVariant & { id: string })[] = [];
  for (const color of ["white", "black", "blue"]) {
    rows.push({ id: `${color}-5-l`, dims: { color, mah: "5000", con: "lightning" }, stock: 10 });
    rows.push({ id: `${color}-5-c`, dims: { color, mah: "5000", con: "typec" }, stock: 10 });
    rows.push({ id: `${color}-10-c`, dims: { color, mah: "10000", con: "typec" }, stock: color === "blue" ? 0 : 5 });
  }
  return rows;
}

test("colour names lose the variant text and -new suffixes", () => {
  assert.equal(cleanColorName("White - 5000 mah - Lighting"), "White");
  assert.equal(cleanColorName("White-new"), "White");
  assert.equal(cleanColorName("White new"), "White");
  assert.equal(cleanColorName("  Space Grey  "), "Space Grey");
  assert.equal(cleanColorName("Newport Blue"), "Newport Blue");
  assert.equal(cleanColorName(null), "");
  assert.equal(colorKey("WHITE - 10000mah"), colorKey("white"));
});

test("a tap that still makes a real variant changes nothing else", () => {
  const r = selectOption(powerBank(), { color: "white", mah: "5000", con: "lightning" }, "color", "black");
  assert.deepEqual(r.selection, { color: "black", mah: "5000", con: "lightning" });
  assert.deepEqual(r.changed, []);
});

test("an impossible tap keeps the tap and changes the fewest other groups", () => {
  const r = selectOption(powerBank(), { color: "white", mah: "5000", con: "lightning" }, "mah", "10000");
  assert.deepEqual(r.selection, { color: "white", mah: "10000", con: "typec" });
  assert.deepEqual(r.changed, [{ key: "con", from: "lightning", to: "typec" }]);
});

test("a sold-out match is still chosen when it is the only way to keep the tap", () => {
  const r = selectOption(powerBank(), { color: "blue", mah: "5000", con: "typec" }, "mah", "10000");
  assert.deepEqual(r.selection, { color: "blue", mah: "10000", con: "typec" });
  assert.equal(findVariant(powerBank(), r.selection)?.stock, 0);
});

test("in-stock variants win a tie", () => {
  const variants: OptionVariant[] = [
    { dims: { color: "red", size: "s" }, stock: 0 },
    { dims: { color: "red", size: "m" }, stock: 3 },
    { dims: { color: "blue", size: "l" }, stock: 3 },
  ];
  const r = selectOption(variants, { color: "blue", size: "l" }, "color", "red");
  assert.equal(r.selection.size, "m");
});

test("values are greyed out only when nothing with them can be bought", () => {
  const v = powerBank();
  assert.equal(isValueUnavailable(v, "con", "lightning"), false);
  assert.equal(isValueUnavailable(v, "mah", "10000"), false);
  assert.equal(isValueUnavailable(v, "color", "pink"), true);
  assert.equal(isValueUnavailable([{ dims: { color: "x" }, stock: 0 }], "color", "x"), true);
  assert.equal(isValueUnavailable([{ dims: { color: "x" }, stock: null }], "color", "x"), false);
});

test("findVariant prefers an in-stock duplicate row", () => {
  const variants = [
    { id: "a", dims: { color: "white" }, stock: 0 },
    { id: "b", dims: { color: "white" }, stock: 4 },
  ];
  assert.equal(findVariant(variants, { color: "white" })?.id, "b");
  assert.equal(findVariant(variants, { color: "black" }), null);
});

test("products without options keep working", () => {
  const r = selectOption([], {}, "color", "white");
  assert.deepEqual(r.changed, []);
  assert.equal(findVariant([{ dims: {}, stock: 2 }], {})?.stock, 2);
});

test("variant summary reads the same everywhere", () => {
  assert.equal(
    variantSummary("White - 5000 mah - Lighting", [
      { attributeName: "Mah", value: "10000mAh" },
      { attributeName: "Connector", value: "Type-C" },
    ]),
    "White · 10000mAh · Type-C",
  );
  assert.equal(variantSummary(null, [{ attributeName: "Size", value: "M" }]), "M");
  assert.equal(variantSummary("Black", null), "Black");
  assert.equal(variantSummary("", []), "");
});
