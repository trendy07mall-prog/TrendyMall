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
    <dl className="flex flex-col text-sm">
      {rows.map(([label, val], index) => (
        <div
          key={label}
          className={`grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 rounded-[var(--radius-sm)] px-3 py-2.5 ${
            index % 2 === 1 ? "bg-black/[0.02]" : ""
          }`}
        >
          <dt className="text-[var(--muted)]">{label}</dt>
          <dd className="min-w-0 font-medium break-words">{val}</dd>
        </div>
      ))}
    </dl>
  );
}
