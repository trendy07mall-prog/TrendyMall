import Link from "next/link";
import { GridIcon, BadgePercentIcon, PercentIcon, CartIcon, ImageIcon } from "@/components/ui/Icon";

// One button per already-confirmed-real route -- no placeholder actions.
const ACTIONS = [
  { label: "Add Product", href: "/admin/products/new", icon: GridIcon },
  { label: "Campaigns", href: "/admin/campaigns", icon: BadgePercentIcon },
  { label: "Coupons", href: "/admin/coupons", icon: PercentIcon },
  { label: "Orders", href: "/admin/orders", icon: CartIcon },
  { label: "Banner", href: "/admin/banner", icon: ImageIcon },
];

export function QuickActionsSection() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="transition-brand flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 text-center hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[#0F2D52]/10 text-[#0F2D52]">
            <action.icon className="h-5 w-5" />
          </span>
          <span className="text-xs font-medium">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
