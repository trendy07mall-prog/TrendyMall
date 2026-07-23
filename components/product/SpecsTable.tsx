import type { Product } from "@/types";

export function SpecsTable({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const rows: [string, string][] = [["Category", categoryName]];

  if (product.brand) rows.push(["Brand", product.brand]);
  if (product.model) rows.push(["Model", product.model]);
  if (product.compatible_devices.length > 0) {
    rows.push(["Compatible devices", product.compatible_devices.join(", ")]);
  }
  rows.push(["Bluetooth", product.bluetooth ? "Yes" : "No"]);
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
