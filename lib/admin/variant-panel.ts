// Shared by ProductsTable.tsx's header row and VariantEditRow.tsx's data
// rows -- one source, not two copies of the same string that could drift
// out of alignment with each other. Colour flexible, Regular/Sale fixed
// width for a formatted price, Stock narrow, Status wide enough for a
// toggle + "Inactive".
export const VARIANT_GRID_COLS = "grid-cols-[minmax(110px,1.4fr)_84px_84px_64px_120px]";
