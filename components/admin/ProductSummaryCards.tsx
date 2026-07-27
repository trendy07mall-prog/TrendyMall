import Link from "next/link";
import {
  GridIcon,
  CheckBadgeIcon,
  StarIcon,
  AlertTriangleIcon,
  CloseIcon,
} from "@/components/ui/Icon";
import type { ProductSummaryCounts } from "@/lib/admin/products-query";

export function ProductSummaryCards({ counts }: { counts: ProductSummaryCounts }) {
  const cards = [
    { label: "Total Products", value: counts.total, icon: GridIcon, href: null },
    { label: "Active", value: counts.active, icon: CheckBadgeIcon, href: null },
    { label: "Featured", value: counts.featured, icon: StarIcon, href: null },
    {
      label: "Low Stock",
      value: counts.lowStock,
      icon: AlertTriangleIcon,
      href: "/admin/products?stockStatus=low_stock",
    },
    {
      label: "Out of Stock",
      value: counts.outOfStock,
      icon: CloseIcon,
      href: "/admin/products?stockStatus=out_of_stock",
    },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0">
      {cards.map((card) => {
        const body = (
          <div className="transition-brand flex w-[68%] shrink-0 snap-start flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)] sm:w-auto">
            <card.icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{card.label}</p>
          </div>
        );
        return card.href ? (
          <Link key={card.label} href={card.href}>
            {body}
          </Link>
        ) : (
          <div key={card.label}>{body}</div>
        );
      })}
    </div>
  );
}
