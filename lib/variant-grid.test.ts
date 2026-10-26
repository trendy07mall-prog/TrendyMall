import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMissingCombinations,
  colorNameProblem,
  colorsFromRows,
  gridProblemText,
  gridProblems,
  tidyRows,
  type GridGroup,
  type GridRow,
} from "./variant-grid";

const BLANK: GridRow & { id?: string } = {
  colorName: "",
  colorHex: "",
  regularPrice: "",
  salePrice: "",
  stock: "",
  attributeValueIds: [],
};

const groups: GridGroup[] = [
  { id: "mah", name: "Mah", valueIds: ["5k", "10k"] },
  { id: "con", name: "Connector", valueIds: ["light", "typec"] },
];

function row(colorName: string, ids: string[], price = "3500", extra: Partial<GridRow & { id: string }> = {}) {
  return { ...BLANK, colorName, colorHex: "#ffffff", regularPrice: price, attributeValueIds: ids, ...extra };
}

test("colour names must be just the colour, once", () => {
  const colors = [{ name: "White", hex: "#fff" }];
  assert.match(colorNameProblem("Black - 5000 mah", colors) ?? "", /Only the colour name/);
  assert.match(colorNameProblem("white", colors) ?? "", /already in the list/);
  assert.equal(colorNameProblem("white", colors, "white"), null);
  assert.equal(colorNameProblem("Space-Grey", colors), null);
  assert.ok(colorNameProblem("  ", colors));
});

test("messy colour names become one colour with one swatch", () => {
  const rows = [
    row("White", ["5k", "light"]),
    row("White - 5000 mah - Type C", ["5k", "typec"], "3500", { colorHex: "#fefefe" }),
    row("White-new", ["10k", "typec"]),
    row("Black", ["5k", "light"], "3500", { colorHex: "#000000" }),
  ];
  assert.deepEqual(colorsFromRows(rows), [
    { name: "White", hex: "#ffffff" },
    { name: "Black", hex: "#000000" },
  ]);
  const tidy = tidyRows(rows);
  assert.deepEqual(tidy.map((r) => r.colorName), ["White", "White", "White", "Black"]);
  assert.equal(tidy[1].colorHex, "#ffffff");
  assert.equal(tidy[0], rows[0]);
});

test("create all combinations keeps existing rows and adds only the missing ones", () => {
  const rows = [
    row("White", ["5k", "light"], "3500", { id: "w1", stock: "50" }),
    row("White", ["10k", "typec"], "4500", { id: "w2" }),
    row("Black", ["5k", "light"], "3500", { id: "b1", colorHex: "#000000" }),
  ];
  const colors = colorsFromRows(rows);
  const { rows: next, added } = addMissingCombinations(rows, colors, groups, BLANK);
  assert.equal(added, 5);
  assert.equal(next.length, 8);
  // Existing rows untouched and still first for their colour.
  assert.equal(next[0], rows[0]);
  assert.equal(next[1], rows[1]);
  // New White rows sit with the other whites, before Black.
  assert.deepEqual(next.slice(0, 4).map((r) => r.colorName), ["White", "White", "White", "White"]);
  assert.equal(next[4], rows[2]);
  // Priced like an existing row with the same options; stock left blank.
  const black10c = next.find((r) => r.colorName === "Black" && r.attributeValueIds.join() === "10k,typec");
  assert.equal(black10c?.regularPrice, "4500");
  assert.equal(black10c?.stock, "");
  assert.equal(black10c?.colorHex, "#000000");
  // A second run adds nothing.
  assert.equal(addMissingCombinations(next, colors, groups, BLANK).added, 0);
});

test("combinations work with no colours or no options", () => {
  const noColour = addMissingCombinations([], [], groups, BLANK);
  assert.equal(noColour.added, 4);
  assert.ok(noColour.rows.every((r) => r.colorName === ""));
  const coloursOnly = addMissingCombinations(
    [row("White", [])],
    [
      { name: "White", hex: "#fff" },
      { name: "Blue", hex: "#00f" },
    ],
    [],
    BLANK,
  );
  assert.equal(coloursOnly.added, 1);
  assert.equal(coloursOnly.rows[1].colorName, "Blue");
  assert.equal(coloursOnly.rows[1].regularPrice, "3500");
});

test("save is blocked for duplicate, incomplete and unpriced sold rows", () => {
  const rows = [
    row("White", ["5k", "light"]),
    row("White-new", ["5k", "light"]),
    row("Black", ["5k"]),
    row("Black", ["10k", "typec"], ""),
    row("Black", ["10k", "light"], "", { notSold: true }),
  ];
  const p = gridProblems(rows, groups);
  assert.deepEqual(p.duplicates, [1]);
  assert.deepEqual(p.missing, [{ index: 2, group: "Connector" }]);
  assert.deepEqual(p.unpriced, [3]);
  assert.match(gridProblemText(p) ?? "", /same colour and options \(row 2\)/);
  assert.match(gridProblemText({ ...p, duplicates: [] }) ?? "", /Row 3 has no Connector/);
  assert.match(gridProblemText({ duplicates: [], missing: [], unpriced: [3] }) ?? "", /1 row needs a price/);
});

test("an option group no row uses is not flagged, and clean rows pass", () => {
  const rows = [row("White", ["5k"]), row("Black", ["5k"])];
  const p = gridProblems(rows, groups);
  assert.deepEqual(p, { duplicates: [], missing: [], unpriced: [] });
  assert.equal(gridProblemText(p), null);
  assert.equal(gridProblemText(gridProblems([row("", [])], [])), null);
});
