"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import {
  UserIcon,
  MapPinIcon,
  CartIcon,
  HeartIcon,
  TicketPercentIcon,
  StarIcon,
  BellIcon,
  GearIcon,
  LogoutIcon,
} from "@/components/ui/Icon";

// Full 9-item list as of Phase 3 — every entry now has a real page behind
// it (Notifications/Settings were the last two, added this phase).
const NAV_ITEMS = [
  { href: "/account/profile", label: "Profile", icon: UserIcon },
  { href: "/account/orders", label: "My Orders", icon: CartIcon },
  { href: "/account/wishlist", label: "Wishlist", icon: HeartIcon },
  { href: "/account/addresses", label: "Saved Addresses", icon: MapPinIcon },
  { href: "/account/coupons", label: "Coupons", icon: TicketPercentIcon },
  { href: "/account/reviews", label: "My Reviews", icon: StarIcon },
  { href: "/account/notifications", label: "Notifications", icon: BellIcon },
  { href: "/account/settings", label: "Settings", icon: GearIcon },
];

export function AccountNav({
  fullName,
  phone,
}: {
  fullName: string | null;
  phone: string | null;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4 md:w-64 md:shrink-0">
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
        <AccountAvatar fullName={fullName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{fullName || "Your account"}</p>
          {phone && <p className="truncate text-xs text-[var(--muted)]">{phone}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`transition-brand flex min-h-11 items-center gap-2.5 rounded-[var(--radius-btn)] px-3 text-sm font-medium ${
                isActive
                  ? "bg-[var(--foreground)] text-white"
                  : "text-[var(--foreground)] hover:bg-black/5"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <form action={signOut}>
          <button
            type="submit"
            className="transition-brand flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-btn)] px-3 text-left text-sm font-medium text-[var(--foreground)] hover:bg-black/5"
          >
            <LogoutIcon className="h-4 w-4 shrink-0" />
            Log out
          </button>
        </form>
      </div>
    </nav>
  );
}
