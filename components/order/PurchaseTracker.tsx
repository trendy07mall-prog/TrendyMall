"use client";

import { useEffect } from "react";
import { trackConversion } from "@/lib/analytics/track";

const LOGGED_KEY_PREFIX = "tm_purchase_logged_";

// order-confirmation is reached at every stage of an order's life, not just
// right after checkout -- a customer can revisit or refresh this page days
// later to check status. Without a dedup guard, every one of those visits
// would re-fire Purchase and double (or triple, or...) count real revenue
// in Meta's reporting and our own funnel. localStorage, keyed per order
// number, makes "already logged" survive refreshes and new tabs, not just
// the current page's lifetime.
export function PurchaseTracker({
  orderNumber,
  total,
  productIds,
}: {
  orderNumber: string;
  total: number;
  productIds: string[];
}) {
  useEffect(() => {
    const key = `${LOGGED_KEY_PREFIX}${orderNumber}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      // localStorage unavailable (private browsing, etc.) -- fire anyway
      // rather than silently never tracking a real purchase; the worst
      // case here is an occasional double-count, not a missing one.
    }

    trackConversion("Purchase", {
      value: total,
      pagePath: `/order-confirmation/${orderNumber}`,
      pixelParams: {
        content_ids: productIds,
        content_type: "product",
        value: total,
        currency: "LKR",
      },
    });
    // productIds is a fresh array reference on every render even when its
    // contents are unchanged -- a stable string key (not the array itself)
    // is what keeps this effect from re-running just because of that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, total, productIds.join(",")]);

  return null;
}
