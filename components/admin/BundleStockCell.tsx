import Link from "next/link";
import { StockBadge } from "@/components/admin/StockBadge";

// The stock column for a bundle in the Products table.
//
// The number is real and it is correct -- since sql/089 the database
// keeps a bundle's stock equal to how many whole bundles its contents
// allow, recalculating it whenever an item is sold, cancelled, restocked
// or edited. That is what makes the cart, checkout, reorder and every
// stock filter work for bundles without knowing bundles exist.
//
// But it is deliberately NOT editable, which is why this is not
// QuickEditStock. Typing a number here would be overwritten by the
// database within the same statement, so offering the box would be
// offering a lie. To change it, change what is inside the bundle or
// restock an item -- and the link says so.
export function BundleStockCell({ bundleId, stock }: { bundleId: string; stock: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm">{stock}</span>
      <StockBadge stock={stock} />
      <Link href={`/admin/bundles/${bundleId}`} className="text-xs text-[var(--muted)] underline">
        set by the items inside
      </Link>
    </div>
  );
}
