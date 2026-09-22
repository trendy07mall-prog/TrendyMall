// Sri Lanka is the only place this store delivers, so "today" and the
// working days after it are facts about the Sri Lankan calendar -- not
// about whichever machine happens to be running this code.
//
// That distinction is load-bearing, because getEstimatedDeliveryRange is
// called from CLIENT components (the PDP's delivery card, checkout's order
// summary), so it runs twice for the same page: once on the server during
// SSR and again in the browser during hydration. On Vercel the server runs
// in UTC while the customer's browser is in Asia/Colombo (+05:30), and
// between 18:30 and 24:00 UTC -- midnight to 05:30 in Colombo -- the two
// disagree about what day it is. The server rendered "Get it by Wed, Sep
// 23 - Fri, Sep 25" and the browser rendered "Thu, Sep 24 - Sat, Sep 26",
// which React reports as hydration error #418 and resolves by swapping the
// date under the customer.
//
// Pinning the zone is the fix rather than passing the value down as a prop
// from the server: a prop would only hide the disagreement at the call
// sites that happen to be server-rendered, while the underlying function
// stayed dependent on ambient timezone. Both sides now compute the same
// Sri Lankan day wherever they run.
const STORE_TIME_ZONE = "Asia/Colombo";

// Dates are carried through this module as UTC midnight of a Sri Lankan
// calendar day. Every read below is therefore a UTC read (getUTCDay, and a
// formatter pinned to UTC), so nothing can shift the day back out again.
const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const storeDateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// The Sri Lankan calendar day an instant falls on, as UTC midnight of that
// day. formatToParts rather than parsing a formatted string, so a locale
// that orders or punctuates the date differently cannot break it.
function storeCalendarDay(instant: Date): Date {
  const parts = storeDateParts.formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
}

// Matches the delivery-timeframe copy in app/shipping/page.tsx and the
// About page: a named local delivery zone gets 1-2 working days,
// everywhere else gets 2-4. Sundays excluded either way.
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (result.getUTCDay() !== 0) remaining -= 1;
  }
  return result;
}

// isFastZone is optional because several callers (product cards, the
// PDP, cart before an address is entered) don't know the customer's
// address yet -- omitting it defaults to the wider, more conservative
// "other areas" 2-4 day estimate rather than guessing the faster one.
//
// Callers that DO know the address (checkout, order confirmation, cart
// with a saved default address) pass lib/delivery-fee.ts's
// isFastDeliveryZone(matchedZone) -- derived from the very zone that set
// the delivery FEE, so the estimate and the price are two readings of one
// match rather than two independent rules that can disagree. They did
// disagree: this argument used to be isColomboZoneAddress(district,
// postalCode), which quoted Wellampitiya the slow window while charging
// it the fast rate.
//
// `start` and `end` come back as UTC midnight of a Sri Lankan day (see
// above). Only `label` is read anywhere today; anything that starts
// reading the Dates must format them with timeZone "UTC", or it will
// reintroduce exactly the drift this pinning removed.
export function getEstimatedDeliveryRange(
  from: Date = new Date(),
  isFastZone = false,
): { start: Date; end: Date; label: string } {
  const minDays = isFastZone ? 1 : 2;
  const maxDays = isFastZone ? 2 : 4;
  const today = storeCalendarDay(from);
  const start = addBusinessDays(today, minDays);
  const end = addBusinessDays(today, maxDays);
  const label = `Get it by ${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
  return { start, end, label };
}
