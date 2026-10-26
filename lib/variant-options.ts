// How a product page turns option taps (Colour, Mah, Connector...) into one
// variant, and how an ordered variant is described afterwards. Pure
// functions only, so every product shape can be unit tested
// (variant-options.test.ts) without rendering the page.
//
// A variant is described by its "dims": option group key -> value id. The
// colour group uses the key "color" and the clean colour key as its value;
// every attribute group uses its attribute id and the attribute value id.

export const COLOR_GROUP = "color";

export type OptionDims = Record<string, string>;

export interface OptionVariant {
  dims: OptionDims;
  // null = stock not tracked on the variant (falls back to the product's).
  stock: number | null;
}

// Colour names were typed by hand per variant, so some carry the rest of
// the variant in them ("White - 5000 mah - Lighting") or a suffix added to
// dodge a duplicate ("White-new"). Both mean plain "White".
export function cleanColorName(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  if (!raw) return "";
  const [first] = raw.split(/\s+-\s+/);
  const cleaned = first.replace(/[\s_-]*\bnew$/i, "").trim();
  return cleaned || first.trim() || raw;
}

export function colorKey(name: string | null | undefined): string {
  return cleanColorName(name).toLowerCase();
}

function matches(variant: OptionVariant, selection: OptionDims): boolean {
  for (const [key, valueId] of Object.entries(selection)) {
    if (variant.dims[key] !== valueId) return false;
  }
  return true;
}

function inStock(variant: OptionVariant): boolean {
  return variant.stock == null || variant.stock > 0;
}

// The variant for a full selection: the first in-stock match, else the
// first match (shown as out of stock), else null.
export function findVariant<T extends OptionVariant>(variants: T[], selection: OptionDims): T | null {
  const all = variants.filter((v) => matches(v, selection));
  return all.find(inStock) ?? all[0] ?? null;
}

// A value is greyed out only when no variant has it at all, or every
// variant that has it is sold out -- never because of what is picked in
// another group.
export function isValueUnavailable(variants: OptionVariant[], key: string, valueId: string): boolean {
  const withValue = variants.filter((v) => v.dims[key] === valueId);
  return withValue.length === 0 || !withValue.some(inStock);
}

export interface SelectionChange {
  selection: OptionDims;
  // Groups (other than the tapped one) whose value had to change, with the
  // value they had before.
  changed: { key: string; from: string | undefined; to: string }[];
}

// The customer tapped `valueId` in group `key`. Their tap always wins. If
// the rest of the current selection still makes a real variant, nothing
// else moves. If not, pick the variant with that value that changes the
// fewest other groups (in stock first, then the admin's row order), and
// report what changed so the page can say so.
export function selectOption(
  variants: OptionVariant[],
  current: OptionDims,
  key: string,
  valueId: string,
): SelectionChange {
  const next: OptionDims = { ...current, [key]: valueId };
  if (variants.length === 0 || variants.some((v) => matches(v, next))) {
    return { selection: next, changed: [] };
  }

  let best: OptionVariant | null = null;
  let bestScore = Infinity;
  for (const v of variants) {
    if (v.dims[key] !== valueId) continue;
    let score = 0;
    for (const k of Object.keys(current)) {
      if (k !== key && v.dims[k] !== current[k]) score += 1;
    }
    if (!inStock(v)) score += 0.5;
    if (score < bestScore) {
      bestScore = score;
      best = v;
    }
  }
  // No variant carries that value at all: keep the tap and let the page
  // show the combination as unavailable (its pill is greyed out anyway).
  if (!best) return { selection: next, changed: [] };

  const selection: OptionDims = { ...current };
  const changed: SelectionChange["changed"] = [];
  for (const [k, v] of Object.entries(best.dims)) {
    if (!(k in current) && k !== key) continue;
    if (k !== key && current[k] !== v) changed.push({ key: k, from: current[k], to: v });
    selection[k] = v;
  }
  selection[key] = valueId;
  return { selection, changed };
}

// One readable line for an ordered item: "Blue · 10000mAh · Type-C". Used
// by the cart, checkout, confirmation, emails, invoices and admin, so the
// customer and the packer always see the same thing. Old orders saved the
// raw colour text, so it is cleaned here too.
export function variantSummary(
  colorName: string | null | undefined,
  selections: { attributeName: string; value: string }[] | null | undefined,
): string {
  const parts = [cleanColorName(colorName), ...(selections ?? []).map((s) => s.value)];
  return parts.filter((p) => p && p.trim()).join(" · ");
}
