"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserIcon,
  MapPinIcon,
  CartIcon,
  HeartIcon,
  GearIcon,
} from "@/components/ui/Icon";

// A flat 5-item nav — deliberately not a copy of components/admin/
// AdminSidebar.tsx (collapsible rail + mobile drawer, built for ~15 nav
// items across grouped sections). This scale doesn't need any of that:
// a plain sidebar on desktop, a horizontal tab strip on mobile.
const NAV_ITEMS = [
  { href: "/account", label: "Personal Information", icon: UserIcon },
  { href: "/account/addresses", label: "Saved Addresses", icon: MapPinIcon },
  { href: "/account/orders", label: "My Orders", icon: CartIcon },
  { href: "/wishlist", label: "Wishlist", icon: HeartIcon },
  { href: "/account/preferences", label: "Preferences", icon: GearIcon },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] pb-2 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:border-b-0 md:pb-0">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`transition-brand flex shrink-0 items-center gap-2 rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium whitespace-nowrap ${
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
    </nav>
  );
}
