"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/app/auth/actions";
import { CartCount } from "@/components/cart/CartCount";
import { WishlistCount } from "@/components/cart/WishlistCount";
import { SearchBox } from "@/components/layout/SearchBox";
import {
  CartIcon,
  ChevronDownIcon,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserIcon,
} from "@/components/ui/Icon";
import type { Category } from "@/types";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/contact", label: "Contact" },
];

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link href={href} className="group relative py-1">
      {label}
      <span
        className={`transition-brand absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 bg-[var(--foreground)] group-hover:scale-x-100 ${
          isActive ? "scale-x-100" : ""
        }`}
        aria-hidden="true"
      />
    </Link>
  );
}

const DRAWER_TRANSITION_MS = 300;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function NavbarClient({
  user,
  isAdmin,
  categories,
}: {
  user: User | null;
  isAdmin: boolean;
  categories: Category[];
}) {
  const [scrolled, setScrolled] = useState(false);
  // Mounted (DOM present) vs. open (visual "shown" state) are tracked
  // separately so the drawer can play a slide-out/fade-out exit
  // transition before it's removed, instead of vanishing instantly.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drawerWrapperRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(mql.matches);
    function onChange() {
      setReducedMotion(mql.matches);
    }
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const openDrawer = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setDrawerMounted(true);
    if (reducedMotion) {
      setDrawerOpen(true);
    } else {
      requestAnimationFrame(() => setDrawerOpen(true));
    }
  }, [reducedMotion]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    const delay = reducedMotion ? 0 : DRAWER_TRANSITION_MS;
    closeTimeoutRef.current = setTimeout(() => setDrawerMounted(false), delay);
  }, [reducedMotion]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  // Close automatically on route change (e.g. browser back/forward while
  // the drawer happens to be open) — link clicks inside the drawer also
  // call closeDrawer() directly, this is the safety net.
  useEffect(() => {
    // Syncing to an external signal (the route changed) — same class of
    // exception as the localStorage/matchMedia-read effects elsewhere in
    // this app.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Body scroll lock (position:fixed technique, not just overflow:hidden
  // — plain overflow:hidden doesn't reliably block touch-scroll on iOS
  // Safari) with exact scroll-position restoration on close, plus focus
  // trapping and hiding the rest of the page from screen readers while
  // the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;

    const menuButton = menuButtonRef.current;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";

    // The drawer's overlay+panel are rendered as siblings of <header> (not
    // nested inside it) specifically so their z-index compares against
    // other body-level fixed elements (e.g. the WhatsApp button) directly,
    // instead of being trapped inside <header>'s own stacking context
    // (position:sticky + z-index create one) where a higher z-index here
    // would never be able to outrank a fixed sibling outside of it. That
    // means both <header> and the drawer wrapper need to stay visible/
    // interactive below, everything else gets hidden.
    const keep: (Element | null)[] = [headerRef.current, drawerWrapperRef.current];
    const hiddenSiblings: Element[] = [];
    Array.from(document.body.children).forEach((el) => {
      if (!keep.includes(el)) {
        el.setAttribute("aria-hidden", "true");
        el.setAttribute("inert", "");
        hiddenSiblings.push(el);
      }
    });

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      window.scrollTo(0, scrollY);
      hiddenSiblings.forEach((el) => {
        el.removeAttribute("aria-hidden");
        el.removeAttribute("inert");
      });
      window.removeEventListener("keydown", onKeyDown);
      (previouslyFocused ?? menuButton)?.focus();
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 z-[var(--z-nav)] border-b bg-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.06)] backdrop-blur transition-colors duration-200 print:hidden ${
        scrolled ? "border-[var(--border)]" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[var(--container-width)] items-center justify-between px-3 py-5 sm:px-6">
        <Link href="/" className="flex items-center">
          {/* The wordmark is baked into this logo image (unlike the old
              icon-only mark) — no adjacent "TrendyMall" text needed, the
              alt text carries that for accessibility instead. Rendered
              slightly smaller below sm: with Wishlist now always visible
              the icon row needs every spare pixel to fit next to the logo
              at 320px (width/height props stay full-size for a correct
              intrinsic aspect ratio — only the display size is smaller). */}
          {/* unoptimized: static 563x334 source, displayed at a fixed
              small size -- no benefit from Next's Image Optimization
              pipeline, and this renders on every single page. */}
          <Image
            src="/images/logo/trendymall-logo.png"
            alt="TrendyMall"
            width={67}
            height={40}
            priority
            unoptimized
            className="h-8 w-auto sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV_LINKS.slice(0, 2).map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              isActive={pathname === link.href}
            />
          ))}

          <div
            className="group relative"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button
              type="button"
              className="relative flex items-center gap-1 py-1"
              aria-haspopup="true"
              aria-expanded={categoriesOpen}
              onClick={() => setCategoriesOpen((v) => !v)}
            >
              Categories
              <ChevronDownIcon className="h-3.5 w-3.5" />
              <span
                className="transition-brand absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 bg-[var(--foreground)] group-hover:scale-x-100"
                aria-hidden="true"
              />
            </button>
            {categoriesOpen && (
              <div className="absolute top-full left-0 mt-2 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-white py-2 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="block px-4 py-2 text-sm hover:bg-black/5"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {NAV_LINKS.slice(2).map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              isActive={pathname === link.href}
            />
          ))}
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1.5">
          {/* Mobile: no room to expand SearchBox's inline form (see below)
              without overflowing the header at 320-414px, so this just
              navigates to /search directly instead. */}
          <Link
            href="/search"
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-brand hover:bg-black/5 sm:hidden"
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          {/* Desktop/tablet: existing click-to-expand inline search — there's
              room for it here, already confirmed working. */}
          <div className="hidden sm:block">
            <SearchBox />
          </div>

          {/* Shop — mobile/tablet only. Desktop already has "Shop" in the
              text nav (NAV_LINKS above), an icon there would be redundant. */}
          <Link
            href="/shop"
            aria-label="Shop"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-brand hover:bg-black/5 md:hidden"
          >
            <ShoppingBagIcon className="h-5 w-5" />
          </Link>

          {/* Wishlist — always visible, including phone widths. The row's
              gap/padding/logo size are all trimmed on mobile (above and
              below) specifically to keep this 5-icon row fitting at 320px
              without shrinking the 44px touch targets themselves. */}
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative flex h-11 w-11 items-center justify-center rounded-full transition-brand hover:bg-black/5"
          >
            <HeartIcon className="h-5 w-5" />
            <WishlistCount />
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex h-11 w-11 items-center justify-center rounded-full transition-brand hover:bg-black/5"
          >
            <CartIcon className="h-5 w-5" />
            <CartCount />
          </Link>

          <div
            className="relative hidden sm:block"
            onMouseEnter={() => setAccountOpen(true)}
            onMouseLeave={() => setAccountOpen(false)}
          >
            <button
              type="button"
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-brand hover:bg-black/5"
            >
              <UserIcon className="h-5 w-5" />
            </button>
            {accountOpen && (
              <div className="absolute top-full right-0 mt-2 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-white py-2 shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
                {user ? (
                  <>
                    <Link
                      href="/account/orders"
                      className="block px-4 py-2 text-sm hover:bg-black/5"
                    >
                      Your orders
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm hover:bg-black/5"
                      >
                        Admin
                      </Link>
                    )}
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-black/5"
                      >
                        Log out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block px-4 py-2 text-sm hover:bg-black/5">
                      Log in
                    </Link>
                    <Link href="/signup" className="block px-4 py-2 text-sm hover:bg-black/5">
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            onClick={openDrawer}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-brand hover:bg-black/5 md:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      </header>

      {drawerMounted && (
        <div ref={drawerWrapperRef}>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeDrawer}
            className={`fixed inset-0 z-[var(--z-drawer-overlay)] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out md:hidden ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            id="mobile-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className={`fixed top-0 left-0 z-[var(--z-drawer-panel)] flex h-full w-[80%] max-w-96 flex-col gap-6 overflow-y-auto bg-white p-6 shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between">
              <Image
                src="/images/logo/trendymall-logo.png"
                alt="TrendyMall"
                width={47}
                height={28}
                unoptimized
              />
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 text-base">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeDrawer}
                  className="rounded-lg px-2 py-2 hover:bg-black/5"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div>
              <p className="px-2 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                Categories
              </p>
              <nav className="mt-1 flex flex-col gap-1">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    onClick={closeDrawer}
                    className="rounded-lg px-2 py-2 text-sm hover:bg-black/5"
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="mt-auto flex flex-col gap-1 border-t border-[var(--border)] pt-4 text-sm">
              <Link
                href="/wishlist"
                onClick={closeDrawer}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-black/5"
              >
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <HeartIcon className="h-5 w-5" />
                  <WishlistCount />
                </span>
                Wishlist
              </Link>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-black/5"
              >
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <CartIcon className="h-5 w-5" />
                  <CartCount />
                </span>
                Cart
              </Link>
              {user ? (
                <>
                  <Link
                    href="/account/orders"
                    onClick={closeDrawer}
                    className="rounded-lg px-2 py-2 hover:bg-black/5"
                  >
                    Your orders
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={closeDrawer}
                      className="rounded-lg px-2 py-2 hover:bg-black/5"
                    >
                      Admin
                    </Link>
                  )}
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full rounded-lg px-2 py-2 text-left hover:bg-black/5"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeDrawer}
                    className="rounded-lg px-2 py-2 hover:bg-black/5"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={closeDrawer}
                    className="rounded-lg px-2 py-2 hover:bg-black/5"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
