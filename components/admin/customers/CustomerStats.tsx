"use client";

import { formatPrice } from "@/lib/utils";
import { isGoingQuiet, GOING_QUIET_DAYS, type CustomerSummary } from "@/lib/admin/customer-segments";

// Computed from the rows currently passed in, so the strip describes the
// same set the table is showing rather than a separate query that could
// drift from it. That also means it responds to the search box, which is
// what makes "going quiet" actionable -- filter to a segment, read its
// numbers.
export function CustomerStats({ customers }: { customers: CustomerSummary[] }) {
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0);
  // Average ORDER value, not average customer value: divided by the number
  // of orders those customers placed, not by how many customers there are.
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const goingQuiet = customers.filter((c) => isGoingQuiet(c.lastOrderAt)).length;

  const tiles: { label: string; value: string; alert?: boolean }[] = [
    { label: "Total customers", value: String(customers.length) },
    { label: "Repeat customer revenue", value: formatPrice(totalSpent) },
    { label: "Average order value", value: formatPrice(averageOrderValue) },
    {
      label: `Going quiet (${GOING_QUIET_DAYS}+ days)`,
      value: String(goingQuiet),
      alert: true,
    },
  ];

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-[10px] border border-[var(--border)] bg-[var(--color-card)] px-4 py-3.5"
        >
          <p className="text-[12.5px] text-[var(--ac-text-2)]">{tile.label}</p>
          <p
            className={
              "mt-1 text-[20px] font-bold " +
              (tile.alert ? "text-[var(--ac-orange)]" : "text-[var(--ac-navy)]")
            }
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}
