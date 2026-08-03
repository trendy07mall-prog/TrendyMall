"use client";

import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartIcon, HomeIcon, SearchIcon, ShoppingBagIcon, UserIcon } from "@/components/ui/Icon";

// Cart/checkout already have their own sticky primary-action bar (Proceed
// to Checkout / Place Order) — a persistent nav competing for the same
// strip of screen would be the wrong call on both, not just checkout.
const HIDDEN_ROUTE_PREFIXES = ["/cart", "/checkout"];

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

export function MobileBottomNavClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname() ?? "/";
  const barRef = useRef<HTMLElement>(null);

  const hiddenByRoute = HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: HomeIcon, isActive: (p) => p === "/" },
    { href: "/shop", label: "Shop", icon: ShoppingBagIcon, isActive: (p) => p.startsWith("/shop") },
    { href: "/search", label: "Search", icon: SearchIcon, isActive: (p) => p.startsWith("/search") },
    { href: "/cart", label: "Cart", icon: CartIcon, isActive: (p) => p.startsWith("/cart") },
    {
      href: isLoggedIn ? "/account" : "/login",
      label: "Account",
      icon: UserIcon,
      isActive: (p) => p.startsWith("/account") || p.startsWith("/login") || p.startsWith("/signup"),
    },
  ];

  // Publishes into the SAME --mobile-bottom-bar-offset variable app/cart/
  // page.tsx and CheckoutForm.tsx already publish on their own pages — safe
  // because this nav is hidden on exactly those two routes, so there's
  // never a double-publisher conflict. WhatsAppButton/ToastProvider need no
  // changes at all; they already consume this variable generically.
  // --mobile-nav-height is a second, separate variable (raw height, no
  // +16px breathing room) that app/layout.tsx's <main> uses for its own
  // bottom padding, so page content/the footer are never covered — added
  // once at the shared layout level instead of per-page.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    function update() {
      const height = el!.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--mobile-bottom-bar-offset",
        height > 0 ? `${height + 16}px` : "0px",
      );
      document.documentElement.style.setProperty(
        "--mobile-nav-height",
        height > 0 ? `${height}px` : "0px",
      );
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--mobile-bottom-bar-offset");
      document.documentElement.style.removeProperty("--mobile-nav-height");
    };
  }, [hiddenByRoute]);

  return (
    <nav
      ref={barRef}
      aria-label="Primary"
      // "hidden" (not conditional unmounting) so the ResizeObserver above
      // naturally reports height 0 on excluded routes/breakpoints — the
      // exact same "guard on height > 0" pattern cart/page.tsx already
      // proves out, reused rather than reinvented with special-case
      // unmount cleanup.
      className={
        hiddenByRoute
          ? "hidden"
          : "fixed inset-x-0 bottom-0 z-[var(--z-bottom-nav)] flex min-h-[68px] items-stretch border-t border-[var(--border)] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.08)] md:hidden print:hidden"
      }
    >
      {items.map((item) => {
        const active = item.isActive(pathname);
        const color = active ? "text-[#dc2626]" : "text-[var(--muted)]";
        return (
          <Link
            key={item.label}
            href={item.href}
            className="transition-brand flex flex-1 flex-col items-center justify-center gap-0.5"
          >
            <item.icon className={`h-6 w-6 ${color}`} />
            <span className={`text-xs font-medium ${color}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
