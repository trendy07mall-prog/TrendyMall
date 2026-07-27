"use client";

import { usePathname } from "next/navigation";

// The admin dashboard gets its own clean shell (see app/admin/layout.tsx) —
// none of the customer-facing chrome (announcement bar, storefront nav,
// trust section, footer, WhatsApp button) should wrap it. Server components
// passed as `children` here (Navbar, Footer, etc.) still render on the
// server as usual — this only decides whether their already-rendered output
// gets mounted, same pattern already used by CartProvider/WishlistProvider
// wrapping server-rendered children elsewhere in this layout.
export function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
