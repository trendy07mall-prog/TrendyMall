"use client";

import { usePathname } from "next/navigation";
import { SiteSearchBar } from "@/components/layout/SiteSearchBar";

// The big search bar used to sit under the header on every page (and fade
// in on the homepage after the hero). It was removed at the owner's
// request: the header's search icon (SearchBox on desktop, a link to
// /search on mobile) is the way in now.
//
// /search is the one page that still shows it. That page has no search
// input of its own (its empty state says "Use the search bar above"), and
// on mobile the header icon only links back to /search, so without this a
// shopper there could not type or change a query at all.
export function HomeSearchBar() {
  const pathname = usePathname();
  if (pathname !== "/search") return null;

  return (
    <div className="py-4 print:hidden">
      <SiteSearchBar />
    </div>
  );
}
