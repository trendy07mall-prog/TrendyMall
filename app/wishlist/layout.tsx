import type { Metadata } from "next";
import { NOINDEX_FOLLOW } from "@/lib/seo";

// A layout purely to carry metadata: app/wishlist/page.tsx is a client
// component ("use client") and cannot export `metadata` itself.
//
// Unlike /cart, /wishlist is NOT disallowed in robots.txt, so this tag is
// the only thing keeping it out of the index -- and it is the right
// mechanism here. Adding a robots.txt disallow instead would stop
// crawlers fetching the page, which would also stop them reading this
// tag; a page must be crawlable for `noindex` to be seen at all.
//
// `follow` because the page links to real product pages.
export const metadata: Metadata = {
  robots: NOINDEX_FOLLOW,
};

// Returns children untouched -- no wrapper element, so nothing about the
// rendered page changes.
export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
