import { contentsLineLabel } from "@/lib/orders/bundle-lines";

export interface BundleContentRow {
  name: string;
  quantity: number;
  variantName?: string | null;
}

// What was inside a bundle, shown indented under it with NO price.
//
// The lines this renders are the zero-priced order_items rows that exist
// so stock moves per item (sql/085). Showing a price on them -- even
// "Rs 0" -- would tell the customer their earbuds were free, so there is
// deliberately no price column here at all and no way to pass one in.
//
// Shared by the order confirmation, the account order page and the admin
// order page so the three cannot drift.
export function BundleContents({
  items,
  className = "",
}: {
  items: BundleContentRow[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`mt-2 border-l-2 border-[var(--border)] pl-3 ${className}`}>
      <p className="text-xs font-medium text-[var(--muted)]">Includes</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((item, index) => (
          <li key={index} className="text-xs text-[var(--muted)]">
            {contentsLineLabel(item.name, item.quantity, item.variantName)}
          </li>
        ))}
      </ul>
    </div>
  );
}
