"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackConversion } from "@/lib/analytics/track";

// The single source of every PageView, including the very first one --
// fires on mount and again whenever the route actually changes. Debounced
// by construction: this effect only re-runs when `pathname` itself changes
// (React's own dependency comparison), so re-renders on the same route
// never log a second time.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackConversion("PageView", { pagePath: pathname });
  }, [pathname]);

  return null;
}
