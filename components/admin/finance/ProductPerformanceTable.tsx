import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { ProductPerformanceRow } from "@/lib/admin/finance-shared";

function sortHref(basePath: string, searchParams: Record<string, string | string[] | undefined>, sort: "sales" | "units") {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "sort") continue;
    if (typeof value === "string" && value) params.set(key, value);
  }
  params.set("sort", sort);
  return `${basePath}?${params.toString()}`;
}

export function ProductPerformanceTable({
  rows,
  sortBy,
  basePath,
  searchParams,
}: {
  rows: ProductPerformanceRow[];
  sortBy: "sales" | "units";
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-6 py-16 text-center text-sm text-[var(--muted)]">
        No product sales in this period.
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        Product Performance
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--color-text-secondary)]">
              <th className="py-2 pr-4 font-medium">Product</th>
              <th className="py-2 pr-4 text-right font-medium">
                <Link
                  href={sortHref(basePath, searchParams, "units")}
                  className={`hover:underline ${sortBy === "units" ? "text-[var(--foreground)]" : ""}`}
                >
                  Units Sold {sortBy === "units" && "↓"}
                </Link>
              </th>
              <th className="py-2 text-right font-medium">
                <Link
                  href={sortHref(basePath, searchParams, "sales")}
                  className={`hover:underline ${sortBy === "sales" ? "text-[var(--foreground)]" : ""}`}
                >
                  Sales {sortBy === "sales" && "↓"}
                </Link>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.productId ?? row.productName} className="border-b border-[var(--border)] last:border-0">
                <td className="max-w-[320px] truncate py-2.5 pr-4 font-medium" title={row.productName}>
                  {row.productName}
                </td>
                <td className="py-2.5 pr-4 text-right [font-variant-numeric:tabular-nums]">{row.unitsSold}</td>
                <td className="py-2.5 text-right font-medium [font-variant-numeric:tabular-nums]">
                  {formatPrice(row.sales)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
