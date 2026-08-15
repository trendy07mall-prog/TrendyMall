"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  CartIcon,
  CreditCardIcon,
  CashIcon,
  ReturnIcon,
  BadgePercentIcon,
  ChartBarIcon,
  PercentIcon,
  ListIcon,
} from "@/components/ui/Icon";

interface FinanceSection {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  soon?: boolean;
}

const SECTIONS: FinanceSection[] = [
  { href: "/admin/finance", label: "Overview", icon: DashboardIcon },
  { href: "/admin/finance/orders", label: "Orders", icon: CartIcon },
  { href: "/admin/finance/payments", label: "Payments", icon: CreditCardIcon },
  { href: "/admin/finance/expenses", label: "Expenses", icon: CashIcon },
  { href: "/admin/finance/refunds", label: "Refunds", icon: ReturnIcon },
  { href: "/admin/finance/campaign-performance", label: "Campaign Performance", icon: BadgePercentIcon },
  { href: "/admin/finance/product-performance", label: "Product Performance", icon: ChartBarIcon },
  { href: "/admin/finance/commission-settings", label: "Commission Settings", icon: PercentIcon },
  { href: "/admin/finance/reports", label: "Reports", icon: ListIcon, soon: true },
];

// Same lg+/mobile shape as components/admin/settings/SettingsSidebar.tsx:
// sticky vertical list on desktop, horizontally-scrollable tab strip on
// mobile so every section stays reachable with no page-level overflow.
export function FinanceSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Finance sections" className="lg:sticky lg:top-6 lg:w-60 lg:shrink-0">
      <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`flex shrink-0 items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors lg:shrink ${
                active
                  ? "bg-[var(--foreground)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-black/5"
              }`}
            >
              <section.icon className="h-4 w-4 shrink-0" />
              {section.label}
              {section.soon && (
                <span
                  className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-black/5 text-[var(--color-text-secondary)]"
                  }`}
                >
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
