"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  StoreIcon,
  ImageIcon,
  HomeIcon,
  TruckIcon,
  CreditCardIcon,
  WhatsAppIcon,
  BellIcon,
  LinkIcon,
  SearchIcon,
  CheckBadgeIcon,
  MailIcon,
  GearIcon,
} from "@/components/ui/Icon";

const SECTIONS = [
  { href: "/admin/settings/general", label: "General", icon: StoreIcon },
  { href: "/admin/settings/branding", label: "Branding", icon: ImageIcon },
  { href: "/admin/settings/homepage", label: "Homepage", icon: HomeIcon },
  { href: "/admin/settings/shipping", label: "Shipping", icon: TruckIcon },
  { href: "/admin/settings/payment", label: "Payment", icon: CreditCardIcon },
  { href: "/admin/settings/contact", label: "Contact & WhatsApp", icon: WhatsAppIcon },
  { href: "/admin/settings/announcement", label: "Announcement", icon: BellIcon },
  { href: "/admin/settings/social", label: "Social", icon: LinkIcon },
  { href: "/admin/settings/seo", label: "SEO", icon: SearchIcon },
  { href: "/admin/settings/policies", label: "Policies", icon: CheckBadgeIcon },
  { href: "/admin/settings/notifications", label: "Notifications", icon: MailIcon },
  { href: "/admin/settings/maintenance", label: "Maintenance", icon: GearIcon },
] as const;

// lg+: vertical list, sticky alongside the content panel. Below lg: a
// horizontally-scrollable tab strip (same overflow-x-auto pattern already
// used by QuickFilterChips/CategoryCarousel on the storefront) so all 12
// sections stay reachable on mobile with no page-level horizontal overflow.
export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0"
    >
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
