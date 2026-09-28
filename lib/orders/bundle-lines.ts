// Turning a flat list of order_items back into "bundle, then what was
// inside it".
//
// create_order_atomic writes a bundle as one priced line (the bundle
// itself) followed by one line per item inside it, each at Rs 0 and each
// carrying bundle_id = the bundle's product id. Those zero lines exist so
// that stock goes out per item and cancel_order_atomic can put it back
// without any change to the cancel path -- they are bookkeeping, not
// purchases.
//
// Which means no customer may ever see them as "Rs 0" rows in a list.
// Every screen that shows an order -- confirmation, account, admin,
// invoice, packing slip, email -- renders them indented under their
// bundle with no price at all. This function is the one place that knows
// how to pair them up, so those six screens cannot drift apart.
//
// Pure: no database, no React, and it works on any row shape that has the
// two ids, which is why the same function serves the snake_case admin/PDF
// rows and the camelCase customer ones.

export interface BundleLineShape {
  // The bundle's own product id on a parent line; on a contents line,
  // the id of the item inside.
  productId?: string | null;
  // Null/absent on everything except a bundle's contents lines, including
  // every order placed before bundles existed.
  bundleId?: string | null;
}

export interface BundleLineGroup<T> {
  // The line that carries the money and gets a price shown.
  line: T;
  // What was inside it. Empty for every normal product.
  contents: T[];
}

// Groups contents under the bundle line they belong to, preserving the
// order the lines came in.
//
// A contents line whose bundle is not in the list is promoted to a line
// of its own rather than dropped. That should be impossible -- the two
// are written in the same transaction -- but silently hiding a row from a
// packing slip would mean an item missing from a parcel, so the failure
// mode here is "shows something odd", never "shows nothing".
//
// Deliberately done in two passes, so the answer does not depend on the
// order the rows arrived in. Every order_items row written by one
// checkout carries the SAME created_at -- now() is fixed for the whole
// transaction -- so "order by created_at" cannot separate a bundle from
// its contents, and any query without an explicit tie-break may hand
// them over in either order. A single pass would then leave an item
// stranded outside its bundle on a screen, which is exactly the thing
// this file exists to prevent.
export function groupBundleLines<T extends BundleLineShape>(items: T[]): BundleLineGroup<T>[] {
  const groups: BundleLineGroup<T>[] = [];
  // Parent lines only, keyed by the product id a contents line points at.
  const byBundleProductId = new Map<string, BundleLineGroup<T>>();

  // Pass 1: every line that is not bundle contents becomes a group, in
  // the order it came in.
  for (const item of items) {
    if ((item.bundleId ?? null) !== null) continue;
    const group: BundleLineGroup<T> = { line: item, contents: [] };
    groups.push(group);
    if (item.productId) byBundleProductId.set(item.productId, group);
  }

  // Pass 2: file the contents, wherever they happened to appear.
  for (const item of items) {
    const bundleId = item.bundleId ?? null;
    if (bundleId === null) continue;
    const parent = byBundleProductId.get(bundleId);
    if (parent) parent.contents.push(item);
    else groups.push({ line: item, contents: [] });
  }

  return groups;
}

// How many lines a customer actually sees, which is what "3 products"
// under an order number should count. The contents of a bundle are one
// purchase, not three.
export function customerVisibleLineCount<T extends BundleLineShape>(items: T[]): number {
  return groupBundleLines(items).length;
}

// True when this order contains at least one bundle. Used to decide
// whether a screen needs the indented layout at all.
export function hasBundleLines<T extends BundleLineShape>(items: T[]): boolean {
  return items.some((item) => (item.bundleId ?? null) !== null);
}

// The one wording used for a contents line everywhere it is written as
// plain text rather than laid out (packing slip, invoice, email). Keeping
// it here means the indent character and the "x2" form cannot differ
// between a PDF and an e-mail for the same order.
export function contentsLineLabel(name: string, quantity: number, variantName?: string | null): string {
  const withVariant = variantName ? `${name} (${variantName})` : name;
  return quantity > 1 ? `${withVariant} × ${quantity}` : withVariant;
}

// The same grouping for rows read straight out of the database, which are
// snake_case. Two spellings of the same two ids exist in this codebase --
// the customer-facing RPCs return camelCase JSON, the admin pages and the
// PDFs select the columns raw -- so rather than have each caller remember
// to translate, both spellings get a function and the logic stays in one
// place above.
export interface BundleDbRowShape {
  product_id?: string | null;
  bundle_id?: string | null;
}

export function groupBundleRows<T extends BundleDbRowShape>(rows: T[]): BundleLineGroup<T>[] {
  const adapted = rows.map((row) => ({
    row,
    productId: row.product_id ?? null,
    bundleId: row.bundle_id ?? null,
  }));
  return groupBundleLines(adapted).map((group) => ({
    line: group.line.row,
    contents: group.contents.map((entry) => entry.row),
  }));
}
