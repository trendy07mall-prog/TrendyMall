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
    // Meta's deduplication key. It goes in fbq's FOURTH argument, not in
    // pixelParams, which is why simply adding it to the params object
    // would have looked right and done nothing. Meta collapses events
    // that share an eventID and event name, so the same order counts once
    // however many times this fires -- a second device, a shared link, or
    // a future Conversions API sending the same order server-side.
    eventId?: string;
  } = {},
): void {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    if (options.eventId) {
      window.fbq("track", eventName, options.pixelParams, { eventID: options.eventId });
    } else {
      window.fbq("track", eventName, options.pixelParams);
    }
  }

  logEvent({
    eventType: eventName,
    pagePath: options.pagePath ?? window.location.pathname,
    productId: options.productId ?? null,
    value: options.value ?? null,
  }).catch(() => {});
}
