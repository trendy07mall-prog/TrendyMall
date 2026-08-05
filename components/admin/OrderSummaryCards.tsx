import Link from "next/link";
import {
  ShoppingBagIcon,
  FolderIcon,
  TruckIcon,
  MapPinIcon,
  CheckBadgeIcon,
  CloseIcon,
} from "@/components/ui/Icon";
import { ADMIN_ORDER_SUMMARY_CARD_TABS, ADMIN_ORDER_TAB_LABELS } from "@/lib/admin/orderStatusFlow";
import type { AdminOrderTab } from "@/lib/admin/orderStatusFlow";

const CARD_ICONS: Record<AdminOrderTab, typeof ShoppingBagIcon> = {
  all: ShoppingBagIcon,
  new: ShoppingBagIcon,
  packaging: FolderIcon,
  ready_to_ship: TruckIcon,
  out_for_delivery: MapPinIcon,
  delivered: CheckBadgeIcon,
  cancelled: CloseIcon,
  returned: CloseIcon,
};

// Same clickable-count-card shell as ProductSummaryCards.tsx (used on
// /admin/products) — one card per workflow stage, each filtering the list
// on click via ?tab=. Counts come from getAdminOrderStatusCounts, a
// server-side count-only query, not a client-side fetch-then-count.
export function OrderSummaryCards({ counts }: { counts: Record<AdminOrderTab, number> }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-6">
      {ADMIN_ORDER_SUMMARY_CARD_TABS.map((tab) => {
        const Icon = CARD_ICONS[tab];
        return (
          <Link key={tab} href={`/admin/orders?tab=${tab}`}>
            <div className="transition-brand flex w-[68%] shrink-0 snap-start flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)] sm:w-auto">
              <Icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
              <p className="text-2xl font-semibold">{counts[tab]}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{ADMIN_ORDER_TAB_LABELS[tab]}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
