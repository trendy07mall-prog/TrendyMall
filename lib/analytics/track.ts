import { logEvent } from "@/lib/analytics/log-event";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// Every event carries a deduplication id, not just the ones we happened
// to think of. A Conversions API source is sending this pixel a
// server-side copy of PageView, ViewContent, AddToCart, InitiateCheckout
// and Purchase -- so Meta was counting each action twice. Purchase already
// had an id (the order number) and so already collapsed to one; the other
// four had none, and an event with no id cannot be matched against its own
// server-side twin no matter how identical the rest of it is.
//
// Generated per fire rather than derived from anything stable, because
// there is no shared key between a browser AddToCart and its server copy
// other than the id itself: the server copy is a mirror of this very call
// and carries whatever id it was given. A caller with something better --
// Purchase, which has an order number -- passes it explicitly, which also
// makes the id survive a page refresh or a second device.
function generateEventId(eventName: ConversionEventName): string {
  const unique =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  // Prefixed so an id is self-describing in Meta's Test Events view.
  return `${eventName}-${unique}`;
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
    // that share an eventID and event name, so the same action counts
    // once however many copies of it Meta receives.
    //
    // Optional only in the sense that a caller may supply a MEANINGFUL id
    // instead of the generated one. Every event gets an id either way --
    // see the note above the fbq call.
    eventId?: string;
  } = {},
): void {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    // Always send an eventID. Omitting it is what let the server-side copy
    // of this same action be counted as a second event.
    const eventId = options.eventId ?? generateEventId(eventName);
    window.fbq("track", eventName, options.pixelParams, { eventID: eventId });
  }

  logEvent({
    eventType: eventName,
    pagePath: options.pagePath ?? window.location.pathname,
    productId: options.productId ?? null,
    value: options.value ?? null,
  }).catch(() => {});
}
