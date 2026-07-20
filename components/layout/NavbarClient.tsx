"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  UserIcon,
} from "@/components/ui/Icon";
import type { Category } from "@/types";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/contact", label: "Contact" },
];

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/90 backdrop-blur transition-colors duration-200 ${
        scrolled ? "border-[var(--border)]" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-heading text-lg font-extrabold tracking-tight"
        >
          TrendyMall
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {NAV_LINKS.slice(0, 2).map((link) => (
            <Link key={link.href} href={link.href} className="hover:opacity-70">
              {link.label}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 hover:opacity-70"
              aria-haspopup="true"
              aria-expanded={categoriesOpen}
              onClick={() => setCategoriesOpen((v) => !v)}
            >
              Categories
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
            {categoriesOpen && (
              <div className="absolute top-full left-0 mt-2 min-w-44 rounded-[var(--radius-md)] border border-[var(--border)] bg-white py-2 shadow-[var(--shadow-soft)]">
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
            <Link key={link.href} href={link.href} className="hover:opacity-70">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:block">
            <SearchBox />
          </div>

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          >
            <HeartIcon className="h-5 w-5" />
            <WishlistCount />
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          >
            <CartIcon className="h-5 w-5" />
            <CartCount />
          </Link>

          <Link
            href={user ? "/account/orders" : "/login"}
            aria-label={user ? "Your account" : "Log in"}
            className="hidden h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5 sm:flex"
          >
            <UserIcon className="h-5 w-5" />
          </Link>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5 md:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            className="absolute top-0 right-0 flex h-full w-72 flex-col gap-6 bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading text-lg font-extrabold">
                TrendyMall
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
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
                  onClick={() => setDrawerOpen(false)}
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
                    onClick={() => setDrawerOpen(false)}
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
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg px-2 py-2 hover:bg-black/5"
              >
                Wishlist
              </Link>
              {user ? (
                <>
                  <Link
                    href="/account/orders"
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg px-2 py-2 hover:bg-black/5"
                  >
                    Your orders
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setDrawerOpen(false)}
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
                    onClick={() => setDrawerOpen(false)}
                    className="rounded-lg px-2 py-2 hover:bg-black/5"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setDrawerOpen(false)}
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
    </header>
  );
}
