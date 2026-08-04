"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  GridIcon,
  FolderIcon,
  AwardIcon,
  PriceTagIcon,
  ListIcon,
  GemIcon,
  CartIcon,
  UserIcon,
  StarIcon,
  PercentIcon,
  MailIcon,
  ImageIcon,
  ChartBarIcon,
  TruckIcon,
  CreditCardIcon,
  GearIcon,
  AlertTriangleIcon,
  MenuIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/Icon";

const COLLAPSE_STORAGE_KEY = "trendymall-admin-sidebar-collapsed";
const DRAWER_TRANSITION_MS = 300;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  soon?: boolean;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "/admin", label: "Dashboard", icon: DashboardIcon }] },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: GridIcon },
      { href: "/admin/categories", label: "Categories", icon: FolderIcon },
      { href: "/admin/brands", label: "Brands", icon: AwardIcon },
      { href: "/admin/tags", label: "Tags", icon: PriceTagIcon },
      { href: "/admin/spec-templates", label: "Spec Templates", icon: ListIcon },
      { href: "/admin/attributes", label: "Attributes", icon: GemIcon },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: CartIcon },
      { href: "/admin/customers", label: "Customers", icon: UserIcon },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/admin/reviews", label: "Reviews", icon: StarIcon },
      { href: "/admin/coupons", label: "Coupons", icon: PercentIcon },
      { href: "/admin/subscribers", label: "Subscribers", icon: MailIcon },
      { href: "/admin/banner", label: "Banner", icon: ImageIcon },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/admin/analytics", label: "Analytics", icon: ChartBarIcon, soon: true }],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/shipping", label: "Shipping", icon: TruckIcon, soon: true },
      { href: "/admin/payments", label: "Payments", icon: CreditCardIcon, soon: true },
      { href: "/admin/settings", label: "Settings", icon: GearIcon, soon: true },
      { href: "/admin/debug", label: "Error Log", icon: AlertTriangleIcon },
    ],
  },
];

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`}>
          {group.label && !collapsed && (
            <p className="px-3 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              {group.label}
            </p>
          )}
          <div className={`flex flex-col gap-0.5 ${group.label && !collapsed ? "mt-2" : ""}`}>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={`transition-brand flex items-center gap-3 rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-[var(--foreground)] text-white"
                      : "text-[var(--foreground)] hover:bg-black/5"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="flex flex-1 items-center justify-between gap-2">
                      {item.label}
                      {item.soon && (
                        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                          Soon
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      // ignore
    }
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

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

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

  useEffect(
    () => () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    // Syncing to an external signal (the route changed) — same class of
    // exception as the localStorage/matchMedia-read effects elsewhere.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    closeDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
      window.removeEventListener("keydown", onKeyDown);
      (previouslyFocused ?? menuButton)?.focus();
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-[var(--z-nav)] flex items-center gap-3 border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open admin menu"
          aria-expanded={drawerOpen}
          aria-controls="admin-drawer"
          onClick={openDrawer}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-brand hover:bg-black/5"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight">
          <Image src="/images/logo/trendymall-mark.png" alt="" width={32} height={15} />
          Admin
        </span>
      </div>

      {/* Desktop collapsible rail */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--border)] bg-white p-4 lg:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between px-1">
          {!collapsed && (
            <span className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight">
              <Image src="/images/logo/trendymall-mark.png" alt="" width={32} height={15} />
              Admin
            </span>
          )}
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-brand hover:bg-black/5"
          >
            {collapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks collapsed={collapsed} />
        </div>
        <Link
          href="/"
          className="mt-4 rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-black/5"
        >
          {collapsed ? "←" : "← Back to store"}
        </Link>
      </aside>

      {/* Mobile drawer */}
      {drawerMounted && (
        <div>
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={closeDrawer}
            className={`fixed inset-0 z-[var(--z-drawer-overlay)] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out lg:hidden ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            id="admin-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className={`fixed top-0 left-0 z-[var(--z-drawer-panel)] flex h-full w-[80%] max-w-80 flex-col overflow-y-auto bg-white p-4 shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
              drawerOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight">
                <Image src="/images/logo/trendymall-mark.png" alt="" width={32} height={15} />
                Admin
              </span>
              <button
                type="button"
                aria-label="Close admin menu"
                onClick={closeDrawer}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex-1">
              <NavLinks collapsed={false} onNavigate={closeDrawer} />
            </div>
            <Link
              href="/"
              onClick={closeDrawer}
              className="mt-4 rounded-[var(--radius-btn)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-black/5"
            >
              ← Back to store
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
