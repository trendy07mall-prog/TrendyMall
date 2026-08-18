import { logEvent } from "@/lib/analytics/log-event";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type ConversionEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

// The single call site every conversion trigger point uses -- fires the
// Meta Pixel event AND logs the same event to our own `events` table, but
// each independently: if fbq isn't loaded (blocked, or the base script
// hasn't finished its afterInteractive load yet) the pixel call is just
// skipped, and if the server action fails, .catch() swallows it -- neither
// can ever block or break the other, or the UI action that triggered them.
export function trackConversion(
  eventName: ConversionEventName,
  options: {
    // Passed straight through to fbq('track', eventName, pixelParams).
    pixelParams?: Record<string, unknown>;
    productId?: string | null;
    value?: number | null;
    // Defaults to the current URL -- only worth overriding when the caller
    // already knows the logical page (e.g. a route the browser hasn't
    // navigated to yet).
    pagePath?: string;
  } = {},
): void {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    window.fbq("track", eventName, options.pixelParams);
  }

  logEvent({
    eventType: eventName,
    pagePath: options.pagePath ?? window.location.pathname,
    productId: options.productId ?? null,
    value: options.value ?? null,
  }).catch(() => {});
}
