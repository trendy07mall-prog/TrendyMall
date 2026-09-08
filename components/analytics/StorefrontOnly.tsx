"use client";

import { usePathname } from "next/navigation";

// Keeps marketing analytics off the admin panel.
//
// /admin sits under the root layout, so the pixel, GA and the PageView
// tracker were loading and firing on every internal admin page. That cost
// ~228KB of third-party JavaScript per admin page load, and -- worse --
// logged the shop owner's own navigation into the same PageView stream as
// real customer traffic, inflating it with clicks that were never visits.
//
// The children are created by the server component that renders this and
// passed through untouched, so nothing about storefront tracking changes:
// on any non-admin route this is a transparent wrapper. On /admin it
// renders nothing at all, so the script tags never reach the HTML rather
// than being loaded and then suppressed.
export function StorefrontOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
