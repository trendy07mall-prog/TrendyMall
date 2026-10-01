"use client";

import { useEffect, useRef } from "react";

// Fires the Google Ads purchase conversion once, on the order
// confirmation page.
//
// Nothing here touches the Meta pixel: no fbq call, no eventID, no
// shared state. The two run side by side and neither knows about the
// other.
//
// Two separate guards against counting one order twice:
//
//   * transaction_id is the order number, which is what Google itself
//     de-duplicates on. Even if this fired twice, Google counts one.
//   * sessionStorage, keyed by order number, so a refresh or a
//     back-navigation does not send a second hit at all. The ref alone
//     would not survive a reload.
//
// Inert unless BOTH env vars are set, and the tag itself only loads on
// the production hosts (see GoogleAdsTag), so a preview or localhost
// can never reach a live Ads account.

type GtagWindow = Window & {
  gtag?: (command: string, action: string, params: Record<string, unknown>) => void;
};

export function GoogleAdsPurchase({
  orderNumber,
  value,
  currency = "LKR",
}: {
  orderNumber: string;
  // The order total, exactly as stored on the order -- never recomputed
  // here. This component reports a number; it does not decide one.
  value: number;
  currency?: string;
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    if (!adsId || !label || !orderNumber) return;
    if (firedRef.current) return;

    const storageKey = `gads_purchase_${orderNumber}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      // Private mode or blocked storage: fall through and rely on
      // transaction_id de-duplication, which is Google's own mechanism.
    }

    const w = window as GtagWindow;
    if (typeof w.gtag !== "function") return;

    firedRef.current = true;
    w.gtag("event", "conversion", {
      send_to: `${adsId}/${label}`,
      value,
      currency,
      transaction_id: orderNumber,
    });

    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Nothing to do; the transaction_id guard still applies.
    }
  }, [orderNumber, value, currency]);

  return null;
}
