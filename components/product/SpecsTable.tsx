import type { Product } from "@/types";
import type { DisplaySpec } from "@/lib/data/spec-templates";

export function SpecsTable({
  product,
  categoryName,
  specs,
}: {
  product: Product;
  categoryName: string;
  specs: DisplaySpec[];
}) {
  const rows: [string, string][] = [["Category", categoryName]];

  if (product.brand) rows.push(["Brand", product.brand]);
  for (const spec of specs) {
    rows.push([spec.unit ? `${spec.label} (${spec.unit})` : spec.label, spec.value]);
  }
  if (product.sku) rows.push(["SKU", product.sku]);
  rows.push([
    "Availability",
    product.stock > 0 ? `${product.stock} in stock` : "Out of stock",
  ]);

  return (
    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      {rows.map(([label, val]) => (
        <div
          key={label}
          className="flex justify-between border-b border-[var(--border)] pb-2"
        >
          <dt className="text-[var(--muted)]">{label}</dt>
          <dd className="font-medium">{val}</dd>
        </div>
      ))}
    </dl>
  );
}
