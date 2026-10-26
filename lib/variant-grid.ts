// The admin side of product options: the colours list, "Create all
// combinations", and the checks that stop a product being saved with two
// rows for the same choice. Pure functions over plain rows so they can be
// unit tested (variant-grid.test.ts) without the form.
//
// A row's "combination" is its clean colour plus, for every option group
// the product uses (Mah, Connector...), which value of that group it links.

import { cleanColorName, colorKey } from "./variant-options";

export interface GridRow {
  colorName: string;
  colorHex: string;
  regularPrice: string;
  salePrice: string;
  stock: string;
  attributeValueIds: string[];
  // Ticked off in the grid: the shop does not sell this combination, so
  // the row is left out when the product is saved.
  notSold?: boolean;
}

export interface GridColor {
  name: string;
  hex: string;
}

export interface GridGroup {
  id: string;
  name: string;
  valueIds: string[];
}

// Colour names are just the colour now. " - " is how Mah/Connector text
// used to end up inside them ("White - 5000 mah - Lighting").
export function colorNameProblem(name: string, colors: GridColor[], ignoreKey?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Type a colour name.";
  if (/\s-\s/.test(trimmed)) return "Only the colour name here. Mah and connector have their own options.";
  const key = colorKey(trimmed);
  if (key !== ignoreKey && colors.some((c) => colorKey(c.name) === key)) return `${cleanColorName(trimmed)} is already in the list.`;
  return null;
}

// One entry per colour the rows use, in first-seen order, named by the
// clean name and coloured by the first row's swatch.
export function colorsFromRows(rows: GridRow[]): GridColor[] {
  const seen = new Map<string, GridColor>();
  for (const row of rows) {
    const key = colorKey(row.colorName);
    if (!key || seen.has(key)) continue;
    seen.set(key, { name: cleanColorName(row.colorName), hex: row.colorHex || "#000000" });
  }
  return [...seen.values()];
}

// The clean colour name and one swatch per colour on every row, so
// "White-new" and "White - 5000 mah" save as plain "White".
export function tidyRows<T extends GridRow>(rows: T[]): T[] {
  const colors = colorsFromRows(rows);
  return rows.map((row) => {
    const color = colors.find((c) => colorKey(c.name) === colorKey(row.colorName));
    if (!color) return row;
    if (row.colorName === color.name && row.colorHex === color.hex) return row;
    return { ...row, colorName: color.name, colorHex: color.hex };
  });
}

function valueIn(row: GridRow, group: GridGroup): string {
  return row.attributeValueIds.find((id) => group.valueIds.includes(id)) ?? "";
}

function optionsKey(row: GridRow, groups: GridGroup[]): string {
  return groups.map((g) => valueIn(row, g)).join("|");
}

export function comboKey(row: GridRow, groups: GridGroup[]): string {
  return colorKey(row.colorName) + "#" + optionsKey(row, groups);
}

// Every colour x every ticked value of every group. Rows that already
// exist are kept exactly as they are (same id, price, stock, photos); only
// the missing combinations are added, each placed after the last row of
// its colour and priced like an existing row with the same options.
export function addMissingCombinations<T extends GridRow>(
  rows: T[],
  colors: GridColor[],
  groups: GridGroup[],
  blank: T,
): { rows: T[]; added: number } {
  const usedGroups = groups.filter((g) => g.valueIds.length > 0);
  let combos: { color: GridColor | null; valueIds: string[] }[] = (colors.length > 0 ? colors : [null]).map(
    (color) => ({ color, valueIds: [] }),
  );
  for (const g of usedGroups) {
    combos = combos.flatMap((c) => g.valueIds.map((id) => ({ color: c.color, valueIds: [...c.valueIds, id] })));
  }

  const next = [...rows];
  const have = new Set(rows.map((r) => comboKey(r, usedGroups)));
  let added = 0;
  for (const combo of combos) {
    const row: T = {
      ...blank,
      colorName: combo.color?.name ?? "",
      colorHex: combo.color?.hex ?? "",
      attributeValueIds: combo.valueIds,
    };
    const key = comboKey(row, usedGroups);
    if (have.has(key)) continue;
    have.add(key);

    const options = optionsKey(row, usedGroups);
    const twin = rows.find((r) => !r.notSold && r.regularPrice.trim() && optionsKey(r, usedGroups) === options);
    if (twin) {
      row.regularPrice = twin.regularPrice;
      row.salePrice = twin.salePrice;
    }

    const colour = colorKey(row.colorName);
    let at = -1;
    next.forEach((r, i) => {
      if (colorKey(r.colorName) === colour) at = i;
    });
    if (at === -1) next.push(row);
    else next.splice(at + 1, 0, row);
    added += 1;
  }
  return { rows: next, added };
}

export interface GridProblems {
  // Row indexes sharing a combination with an earlier row.
  duplicates: number[];
  // Row indexes that leave an option empty while other rows set it.
  missing: { index: number; group: string }[];
  // Row indexes that are sold but have no price yet.
  unpriced: number[];
}

// Only sold rows count. An option group no row sets is treated as
// "for reference only" and never flagged.
export function gridProblems(rows: GridRow[], groups: GridGroup[]): GridProblems {
  const problems: GridProblems = { duplicates: [], missing: [], unpriced: [] };
  const sold = rows.map((row, index) => ({ row, index })).filter(({ row }) => !row.notSold);
  const usedGroups = groups.filter((g) => sold.some(({ row }) => valueIn(row, g)));

  const seen = new Set<string>();
  for (const { row, index } of sold) {
    const key = comboKey(row, usedGroups);
    if (seen.has(key)) problems.duplicates.push(index);
    seen.add(key);
    for (const g of usedGroups) {
      if (!valueIn(row, g)) problems.missing.push({ index, group: g.name });
    }
    if (!row.regularPrice.trim()) problems.unpriced.push(index);
  }
  return problems;
}

// One sentence for the save bar, or null when the rows can be saved.
export function gridProblemText(p: GridProblems): string | null {
  const row = (i: number) => `row ${i + 1}`;
  if (p.duplicates.length > 0) {
    return `Two rows have the same colour and options (${p.duplicates.map(row).join(", ")}). Change or untick one.`;
  }
  if (p.missing.length > 0) {
    const m = p.missing[0];
    return `Row ${m.index + 1} has no ${m.group} picked.`;
  }
  if (p.unpriced.length > 0) {
    return `${p.unpriced.length === 1 ? "1 row needs" : `${p.unpriced.length} rows need`} a price, or untick ${p.unpriced.length === 1 ? "it" : "them"} if you don't sell ${p.unpriced.length === 1 ? "it" : "them"}.`;
  }
  return null;
}
