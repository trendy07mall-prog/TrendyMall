// A bundle is 2-3 existing products sold together for one price.
//
// The shape of the feature, and why it is shaped that way: a bundle is a
// NORMAL product row with product_kind = 'bundle', carrying exactly one
// option that holds the bundle price, plus rows in bundle_items saying
// what is inside. That choice is what lets the shop grid, the product
// page, the cart, the Meta pixel and every order screen keep working
// untouched -- to all of them a bundle simply IS a product, with its own
// URL, which is what a per-bundle ad needs.
//
// Everything in this file is deliberately pure arithmetic over plain
// objects: no database, no React. The numbers here decide what a customer
// is charged and whether they can buy at all, so they are the part that
// most needs to be testable on its own (lib/bundles.test.ts).

// The price a single unit of an item inside a bundle would cost on its
// own -- sale price when there is one, otherwise the regular price. This
// mirrors how create_order_atomic prices a normal line, deliberately:
// "what you would have paid separately" has to mean the same thing here
// as it does at the till, or the advertised saving is a lie.
export function effectiveUnitPrice(item: { regularPrice: number; salePrice: number | null }): number {
  return item.salePrice ?? item.regularPrice;
}

export interface BundleItemStock {
  // Stock on the product row. Always present.
  productStock: number;
  // Stock on the chosen option. Null means this option does not track its
  // own stock, in which case only the product's number applies -- the same
  // rule create_order_atomic follows when it decides whether to reduce
  // variant stock at all.
  variantStock: number | null;
  // How many of this item go into ONE bundle.
  quantity: number;
}

// How many of this item are really available, given both stock numbers.
function availableUnits(item: BundleItemStock): number {
  if (item.variantStock === null) return Math.max(0, item.productStock);
  return Math.max(0, Math.min(item.productStock, item.variantStock));
}

// How many whole bundles can be sold right now.
//
// Calculated live from the items every time rather than stored as a
// number on the bundle, because a stored copy is a second source of truth
// that drifts the moment any item is sold, restocked or edited on its own
// product page. The bundle's own stock field is deliberately never read.
//
// An item needed 2-per-bundle with 5 in stock supports 2 bundles, not 5 --
// hence the floor division.
export function bundleAvailability(items: BundleItemStock[]): number {
  if (items.length === 0) return 0;
  let lowest = Infinity;
  for (const item of items) {
    if (item.quantity <= 0) continue; // a zero-quantity row cannot limit anything
    lowest = Math.min(lowest, Math.floor(availableUnits(item) / item.quantity));
  }
  return lowest === Infinity ? 0 : Math.max(0, lowest);
}

// "Out of stock" for a bundle means ANY item inside has run out. That
// falls straight out of the line above: if one item is at zero, the
// lowest is zero.
export function isBundleInStock(items: BundleItemStock[]): boolean {
  return bundleAvailability(items) > 0;
}

export interface BundlePriceItem {
  regularPrice: number;
  salePrice: number | null;
  quantity: number;
}

// What the same items would cost bought separately -- the "before" price
// the saving is measured against.
export function bundleSeparateTotal(items: BundlePriceItem[]): number {
  return items.reduce((sum, item) => sum + effectiveUnitPrice(item) * item.quantity, 0);
}

// What the customer saves. Never negative: if a bundle were priced ABOVE
// its parts (a mistake, but possible while typing in the admin form) the
// answer is 0 rather than a negative "saving", and the form warns instead
// of advertising nonsense.
export function bundleSaving(separateTotal: number, bundlePrice: number): number {
  return Math.max(0, separateTotal - bundlePrice);
}

export interface BundleCostItem {
  // Admin-only buying price for this option, from the separate
  // variant_costs table. Null when it has not been entered yet.
  cost: number | null;
  quantity: number;
}

// What the shop actually makes on one bundle: the bundle price minus what
// the items cost to buy.
//
// Returns null -- not 0, and not a wrong number -- when any item is
// missing a cost. A profit figure built on a guessed cost is worse than
// no figure, because it reads as fact. The admin form shows "add cost
// prices to see profit" in that case.
export function bundleProfit(bundlePrice: number, items: BundleCostItem[]): number | null {
  let totalCost = 0;
  for (const item of items) {
    if (item.cost === null) return null;
    totalCost += item.cost * item.quantity;
  }
  return bundlePrice - totalCost;
}

// Percentage off, for the "Save Rs X" badge's secondary line. Guarded
// against a zero separate total so an empty or free bundle cannot produce
// Infinity or NaN on a customer-facing badge.
export function bundleSavingPercent(separateTotal: number, bundlePrice: number): number {
  if (separateTotal <= 0) return 0;
  return Math.round((bundleSaving(separateTotal, bundlePrice) / separateTotal) * 100);
}
