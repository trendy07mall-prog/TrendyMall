"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/app/auth/actions";
import { useScrollState } from "@/context/ScrollStateContext";
import { CartCount } from "@/components/cart/CartCount";
import { WishlistCount } from "@/components/cart/WishlistCount";
import { SearchBox } from "@/components/layout/SearchBox";
import {
  CartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DashboardIcon,
  FolderIcon,
  HeartIcon,
  HomeIcon,
  LogoutIcon,
  MailIcon,
  MenuIcon,
  PackageIcon,
  SearchIcon,
  ShoppingBagIcon,
  TrendUpIcon,
  UserIcon,
} from "@/components/ui/Icon";
import type { Category } from "@/types";

// icon is only consumed by the mobile drawer below -- the desktop <nav>
// still renders these through NavLink (label/href/isActive only), so
// adding it here doesn't touch desktop rendering at all.
const NAV_LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/shop", label: "Shop", icon: ShoppingBagIcon },
  { href: "/new-arrivals", label: "New Arrivals", icon: TrendUpIcon },
  { href: "/contact", label: "Contact", icon: MailIcon },
];

function NavLink({
  href,
  label,
  isActive,
  glass,
}: {
  href: string;
  label: string;
  isActive: boolean;
  // Swaps the underline to the same emerald token the mobile bottom nav's
  // active pill already uses (--color-nav-active-pill) — the one other
  // place this site has an "active nav item" indicator, so glass mode's
  // active state reads as the same design language, not a one-off color.
  glass?: boolean;
}) {
  return (
    <Link href={href} className="group relative py-1">
      {label}
      <span
        className={`transition-brand absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 group-hover:scale-x-100 ${
          glass ? "bg-[var(--color-nav-active-pill)]" : "bg-[var(--foreground)]"
        } ${isActive ? "scale-x-100" : ""}`}
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
  logoUrl = "/images/logo/trendymall-logo.png",
}: {
  user: User | null;
  isAdmin: boolean;
  categories: Category[];
  // Settings-backed (branding.logo_desktop_url) — same source image is used
  // for both the header logo and the mobile drawer's logo below (there's no
  // real desktop/mobile *swap* point in this component today, just two
  // renders of the same file at different sizes), defaulting to today's
  // live file if Settings has nothing.
  logoUrl?: string;
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
  const isCheckout = pathname === "/checkout";

  // "stuck" mirrors what position:sticky is actually doing visually: once
  // the header's own top edge reaches 0, it's pinned and whatever's below
  // it in the DOM (that route's own page content) is now scrolling in
  // underneath it — that's the moment there's real content behind the
  // header for it to be glass over, on any route. One consistent trigger
  // sitewide: solid at the top, glass for the rest of the scroll, solid
  // again back at the top — including "/", which used to drop back to
  // solid once its hero had fully scrolled past (a hero-specific "past"
  // boundary tracked via #hero-sentinel). That boundary is gone now, so
  // glass simply follows `stuck` everywhere, home included.
  //
  // Now sourced from ScrollStateContext (a single sitewide listener)
  // instead of a sentinel/effect local to this component -- the mobile
  // bottom nav needs this exact same "scrolled past the top, stays true
  // until back at 0" signal for its own product-page-only shrink, and
  // audit turned up no reason for two independent listeners to compute
  // the identical value. See ScrollStateContext.tsx for the technique
  // (unchanged: direct getBoundingClientRect() reads, no throttle, same
  // double-rAF AnnouncementBar-hydration-race guard).
  const { headerStuck: stuck } = useScrollState();
  const glass = stuck;

  useEffect(() => {
    // `scrolled` gets its own immediate, undelayed read here -- unlike
    // `stuck`, it has no AnnouncementBar race to dodge (it's a plain
    // window.scrollY > 8 threshold, not a getBoundingClientRect() read
    // dependent on a sibling's layout), so it doesn't need to wait for a
    // double-rAF. Traced via Playwright on non-home routes with more
    // client-side hydration work (Wishlist/Cart reading Context off
    // localStorage, Contact's forms): window.scrollY is already correct at
    // this line the entire time the border shows the wrong (transparent)
    // color on a mid-scroll reload -- the setScrolled(true) call itself is
    // not late, its DOM commit is, queued behind the rest of that page's
    // hydration work competing for the main thread during the busiest
    // part of load. That's normal React scheduling, not a bug this
    // component can fix without forcing a synchronous commit (flushSync)
    // at the cost of blocking hydration elsewhere for a purely cosmetic,
    // self-resolving border -- not a worthwhile trade.
    // Syncing to an external signal (the real, already-current scroll
    // position) — same class of exception as the localStorage/matchMedia-
    // read effects elsewhere in this file.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrolled(window.scrollY > 8);

    function measure() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      resizeObserver.disconnect();
    };
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

  // Glass mode moves the outer <header>'s solid bg/border/shadow onto the
  // inner row instead, floating it as a rounded pill with margin on every
  // side — same "outer = invisible positioning shell, inner = the actual
  // visual chrome" split already proven on the mobile bottom nav's dock
  // redesign. `duration-[var(--transition-duration)]` (not transition-brand)
  // deliberately: this needs border-radius/backdrop-filter/padding in its
  // property list, which transition-brand doesn't cover, but it still reads
  // off the exact same shared motion token globals.css zeroes under
  // prefers-reduced-motion, so it gets that behavior for free without
  // touching the shared utility.
  // Mobile, sitewide: once scrolled past the top (the same `stuck` signal
  // glass mode already follows), the header slides/fades away entirely and
  // stays that way regardless of scroll direction -- only returning once
  // back at true scrollY≈0. Originally shipped product-page-only; extended
  // to every route the same way the glass header itself was earlier (same
  // trigger, no per-page reimplementation). max-md: keeps this a no-op at
  // desktop widths (the plain sticky/glass behavior above is untouched
  // there); transform+opacity only, no layout properties, so there's
  // nothing for the scroll handler itself to thrash. Safe against
  // position:sticky specifically because by the time `stuck` is true the
  // header is already pinned/floating over later content rather than
  // occupying its own reserved flow space -- sliding it away reveals
  // exactly what was already sitting behind it, not a blank gap.
  const autoHideClass = stuck ? "max-md:pointer-events-none max-md:-translate-y-full max-md:opacity-0" : "";

  const headerOuterClass = glass
    ? `sticky top-0 z-[var(--z-nav)] px-3 pt-3 transition-[padding,transform,opacity] duration-[var(--transition-duration)] ease-in-out print:hidden sm:px-4 sm:pt-4 ${autoHideClass}`
    : `sticky top-0 z-[var(--z-nav)] border-b bg-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.06)] backdrop-blur transition-[color,background-color,border-color,transform,opacity] duration-[var(--transition-duration)] print:hidden ${
        isCheckout || scrolled ? "border-[var(--border)]" : "border-transparent"
      } ${autoHideClass}`;

  // Dark-tinted glass (not the bottom nav's light frosted glass) — this
  // header needs to carry WHITE content, and white text on a mostly-white
  // background would fail contrast. The black/32 wash doubles as the
  // "slight dark scrim for legibility" the design brief allows for, so
  // there's one layer instead of two competing ones. text-shadow is real
  // insurance underneath that: hero images are admin-uploaded (see
  // HeroSlider.tsx) with no guaranteed brightness range, and now that
  // glass is sitewide it also has to hold up over plain white/text-heavy
  // pages (Privacy Policy, Terms, FAQ) with far less content behind it to
  // blur — this can't be tuned to one specific background. blur-[32px]
  // (up from the original blur-md/12px) and black/32 (up from black/25)
  // are both bumped for exactly that: enough frosted-glass read on a
  // plain white page, confirmed via Playwright screenshots to still look
  // right (not over-blurred/muddy) over busy product-grid imagery too.
  const headerInnerClass = glass
    ? "mx-auto flex w-full max-w-[var(--container-width)] items-center justify-between rounded-[22px] border border-white/15 bg-black/32 px-3 py-3 text-white shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-[32px] backdrop-saturate-150 transition-[background-color,border-radius,box-shadow,color] duration-[var(--transition-duration)] ease-in-out sm:px-6 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
    : `mx-auto flex w-full max-w-[var(--container-width)] items-center justify-between px-3 sm:px-6 ${
        isCheckout ? "py-2.5" : "py-5"
      }`;

  // Icon-button hover: black/5 (today's solid-header hover) is nearly
  // invisible against the glass header's own dark tint — swapped for a
  // light tint there instead. Purely a hover affordance color, no
  // click-handler/logic difference between the two.
  const iconHoverClass = glass ? "hover:bg-white/15" : "hover:bg-black/5";

  return (
    <>
      <header ref={headerRef} className={headerOuterClass}>
      <div className={headerInnerClass}>
        <Link
          href="/"
          className={`flex items-center ${
            // The source PNG's background is baked-in opaque white, not real
            // transparency (confirmed by sampling its raw pixels: alpha=255
            // throughout, not just where the mark is drawn) -- invisible on
            // today's white solid header, but a stray-looking white
            // rectangle on the dark glass one. mix-blend-mode:multiply was
            // tried first (white blended via multiply is a no-op, in theory)
            // but doesn't reliably composite against this element's own
            // ancestor's backdrop-filter blur in testing -- a known rough
            // edge where those two CSS features don't compose predictably.
            // A small solid white chip behind the logo sidesteps that
            // entirely: same fix real "logo over photography" headers use
            // elsewhere, not a workaround, and doesn't depend on any
            // browser's blend-mode/backdrop-filter interaction.
            glass ? "rounded-lg bg-white/95 px-2 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.15)]" : ""
          }`}
        >
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
            src={logoUrl}
            alt="TrendyMall"
            width={77}
            height={46}
            priority
            unoptimized
            className={isCheckout ? "h-7 w-auto sm:h-8" : "h-9 w-auto sm:h-11"}
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {NAV_LINKS.slice(0, 2).map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              isActive={pathname === link.href}
              glass={glass}
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
                className={`transition-brand absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 group-hover:scale-x-100 ${
                  glass ? "bg-[var(--color-nav-active-pill)]" : "bg-[var(--foreground)]"
                }`}
                aria-hidden="true"
              />
            </button>
            {categoriesOpen && (
              // Always solid white/dark text regardless of header state —
              // explicit text color here (not just the inherited default)
              // because glass mode makes the ambient text color white, and
              // this panel's own text was previously relying on inheriting
              // dark text implicitly. A translucent, blurred dropdown full
              // of category names would also just be a legibility problem
              // no version of "glass" fixes, so this one dropdown
              // deliberately stays outside the glass treatment entirely.
              <div className="absolute top-full left-0 mt-2 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-white py-2 text-[var(--foreground)] shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
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
              glass={glass}
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
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-brand sm:hidden ${iconHoverClass}`}
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          {/* Desktop/tablet: existing click-to-expand inline search — there's
              room for it here, already confirmed working. Its own expanded
              input is a real text field, so it stays fully opaque white
              regardless of header state (see SearchBox.tsx, unchanged) —
              same reasoning as the Categories dropdown above. */}
          <div className="hidden sm:block">
            <SearchBox />
          </div>

          {/* Shop — mobile/tablet only. Desktop already has "Shop" in the
              text nav (NAV_LINKS above), an icon there would be redundant. */}
          <Link
            href="/shop"
            aria-label="Shop"
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-brand md:hidden ${iconHoverClass}`}
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
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-brand ${iconHoverClass}`}
          >
            <HeartIcon className="h-5 w-5" />
            <WishlistCount />
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-brand ${iconHoverClass}`}
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
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-brand ${iconHoverClass}`}
            >
              <UserIcon className="h-5 w-5" />
            </button>
            {accountOpen && (
              // Same "stays solid regardless of header state" reasoning as
              // the Categories dropdown above.
              <div className="absolute top-full right-0 mt-2 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-white py-2 text-[var(--foreground)] shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
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
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-brand md:hidden ${iconHoverClass}`}
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
            // Same light-glass surface language as the bottom nav's dock
            // (translucent white + blur + saturate + a hairline white
            // border), just far more opaque -- this panel carries dense
            // text (nav labels, ~20 category names, badge counts), where
            // the bottom nav's 70% translucency would hurt legibility.
            // Edge-to-edge (no corner radius on the panel itself): unlike
            // the header's floating pill, this drawer is pinned flush to
            // the viewport's top/left/bottom, so there's no surrounding
            // margin for outer rounding to read against -- "rounded"
            // here instead lives on every row/pill inside.
            className={`fixed top-0 left-0 z-[var(--z-drawer-panel)] flex h-full w-[80%] max-w-96 flex-col overflow-y-auto border-r border-white/60 bg-white/95 shadow-[8px_0_40px_rgba(0,0,0,0.16)] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 ease-in-out md:hidden ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <Image
                src={logoUrl}
                alt="TrendyMall"
                width={61}
                height={36}
                unoptimized
                className="h-9 w-auto"
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

            <div className="flex flex-1 flex-col gap-6 px-4 py-5">
              <nav className="flex flex-col gap-0.5 text-[15px] font-medium">
                {NAV_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeDrawer}
                      aria-current={active ? "page" : undefined}
                      // Same emerald active-pill token the bottom nav's
                      // active icon uses (--color-nav-active-pill /
                      // --color-nav-active-icon), just a full-width
                      // tinted row instead of a circular pill -- the row
                      // shape this list format calls for, same accent.
                      className={`transition-brand flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                        active
                          ? "bg-[var(--color-nav-active-pill)]/12 text-[var(--color-nav-active-icon)]"
                          : "text-[var(--foreground)] hover:bg-black/5"
                      }`}
                    >
                      <link.icon className="h-[18px] w-[18px]" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div>
                <div className="flex items-center gap-1.5 px-3">
                  <FolderIcon className="h-3.5 w-3.5 text-[var(--muted)]" />
                  <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                    Categories
                  </p>
                </div>
                <nav className="mt-1.5 flex flex-col gap-0.5">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.slug}`}
                      onClick={closeDrawer}
                      className="transition-brand flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] hover:bg-black/5"
                    >
                      <span>{category.name}</span>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="mt-auto flex flex-col gap-0.5 border-t border-[var(--border)] pt-4 text-sm font-medium">
                <Link
                  href="/wishlist"
                  onClick={closeDrawer}
                  className="transition-brand flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/5"
                >
                  <span className="relative flex h-[18px] w-[18px] items-center justify-center">
                    <HeartIcon className="h-[18px] w-[18px]" />
                    <WishlistCount />
                  </span>
                  Wishlist
                </Link>
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="transition-brand flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/5"
                >
                  <span className="relative flex h-[18px] w-[18px] items-center justify-center">
                    <CartIcon className="h-[18px] w-[18px]" />
                    <CartCount />
                  </span>
                  Cart
                </Link>
                {user ? (
                  <>
                    <Link
                      href="/account/orders"
                      onClick={closeDrawer}
                      className="transition-brand flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/5"
                    >
                      <PackageIcon className="h-[18px] w-[18px]" />
                      Your orders
                    </Link>
                    {isAdmin && (
                      // Visually distinct from the customer rows above --
                      // same deep navy AdminSidebar.tsx's own active-item
                      // state already uses (#0F2D52), not a new color.
                      <div className="mt-1 rounded-xl border border-[#0F2D52]/15 bg-[#0F2D52]/[0.06] p-1">
                        <Link
                          href="/admin"
                          onClick={closeDrawer}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold text-[#0F2D52] hover:bg-[#0F2D52]/10"
                        >
                          <DashboardIcon className="h-[18px] w-[18px]" />
                          Admin
                        </Link>
                      </div>
                    )}
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="transition-brand flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-black/5"
                      >
                        <LogoutIcon className="h-[18px] w-[18px]" />
                        Log out
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeDrawer}
                      className="transition-brand flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/5"
                    >
                      <UserIcon className="h-[18px] w-[18px]" />
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={closeDrawer}
                      className="transition-brand flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/5"
                    >
                      <UserIcon className="h-[18px] w-[18px]" />
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
