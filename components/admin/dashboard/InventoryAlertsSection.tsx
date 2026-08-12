import Link from "next/link";
import { AlertTriangleIcon, CheckBadgeIcon } from "@/components/ui/Icon";
import type { LowStockRow } from "@/lib/admin/dashboard-query";

export function InventoryAlertsSection({ lowStock }: { lowStock: LowStockRow[] }) {
  if (lowStock.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] px-6 py-10 text-center">
        <CheckBadgeIcon className="h-6 w-6 text-emerald-600" />
        <p className="text-sm text-[var(--color-text-secondary)]">Nothing low on stock right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <ul className="flex flex-col gap-3">
        {lowStock.map((product) => (
          <li key={product.id} className="flex items-center gap-3">
            <AlertTriangleIcon
              className={`h-4 w-4 shrink-0 ${product.stock === 0 ? "text-[var(--color-discount)]" : "text-[var(--color-warning)]"}`}
            />
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="min-w-0 flex-1 truncate text-sm hover:underline"
            >
              {product.name}
            </Link>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                product.stock === 0
                  ? "bg-[var(--color-discount)]/10 text-[var(--color-discount)]"
                  : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
              }`}
            >
              {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
