"use client";

import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CartIcon, HomeIcon, SearchIcon, ShoppingBagIcon, UserIcon } from "@/components/ui/Icon";
import { CartCount } from "@/components/cart/CartCount";

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
  // No spring/bounce anywhere in this component, per spec — and instant
  // (zero-duration) once prefers-reduced-motion is on, same pattern as
  // components/motion/FadeIn.tsx.
  const reducedMotion = useReducedMotion();
  const TRANSITION = reducedMotion
    ? { duration: 0 }
    : { type: "tween" as const, duration: 0.22, ease: "easeInOut" as const };

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
  //
  // Both variables are read off THIS element's own getBoundingClientRect(),
  // which does not include margin — so the pill's outer spacing below is
  // deliberately real padding on this same ref'd <nav>, not margin on an
  // inner element, or these published heights would silently under-report
  // the pill's true footprint (exactly the bug class that broke this
  // corner of the site before).
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
      //
      // The floating-pill margin is real padding on this element (not
      // margin on the inner pill div below) so the ResizeObserver's
      // measured height already includes it — see the comment on the
      // effect above. pb- folds env(safe-area-inset-bottom) directly into
      // that same measured box, which is what keeps the pill clear of the
      // iPhone home indicator without a separate unmeasured offset.
      className={
        hiddenByRoute
          ? "hidden"
          : // pointer-events-none on this full-width wrapper, restored on the
            // pill below: the dock is now a narrow floating pill (not a
            // near-full-width bar), so the transparent side margins around it
            // sit directly over real page content on both sides. Without
            // this, that see-through glass gap would silently swallow taps
            // meant for whatever's underneath, even though nothing is
            // visibly there to suggest that.
            "pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-bottom-nav)] flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden print:hidden"
      }
    >
      <div className="pointer-events-auto flex h-14 w-[88%] max-w-[380px] items-center justify-around rounded-full border border-white/50 bg-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md backdrop-saturate-150">
        {items.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="relative flex min-h-11 min-w-11 flex-1 items-center justify-center"
            >
              {active && (
                // Instagram-style active tab, scoped to just this component:
                // a flat neutral pill (no color, no glow) -- emerald stays
                // the site's status/success color everywhere else (cart
                // badges, stock status, admin toggles), this is the one
                // deliberate exception.
                <motion.span
                  layoutId="bottom-nav-active-pill"
                  transition={TRANSITION}
                  className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-black/[0.07]"
                />
              )}
              <span className="relative flex">
                <item.icon
                  className={`relative h-5 w-5 transition-transform duration-[220ms] motion-reduce:transition-none ${
                    active ? "scale-105 text-[var(--foreground)]" : "text-[var(--color-text-secondary)]"
                  }`}
                />
                {item.label === "Cart" && <CartCount variant="nav" />}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
