import type { Metadata } from "next";
import { NOINDEX_FOLLOW } from "@/lib/seo";

// A layout purely to carry metadata: app/cart/page.tsx is a client
// component ("use client"), and a client component cannot export
// `metadata`. This is the documented way to attach it to such a route.
//
// Note on overlap with robots.ts: /cart is ALSO disallowed in
// robots.txt, which means a compliant crawler never fetches the page and
// so never reads this tag. That is not a contradiction -- the disallow is
// what keeps crawlers out today, and this is what keeps the page out of
// the index if the disallow is ever relaxed. Belt and braces, with the
// belt doing the work.
export const metadata: Metadata = {
  robots: NOINDEX_FOLLOW,
};

// Returns children untouched -- no wrapper element, so the rendered DOM
// and the page's layout are byte-for-byte what they were.
export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
