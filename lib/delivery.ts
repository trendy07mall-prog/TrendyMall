const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

// Matches the delivery-timeframe copy in app/shipping/page.tsx and the
// About page: a named local delivery zone gets 1-2 working days,
// everywhere else gets 2-4. Sundays excluded either way.
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0) remaining -= 1;
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
export function getEstimatedDeliveryRange(
  from: Date = new Date(),
  isFastZone = false,
): { start: Date; end: Date; label: string } {
  const minDays = isFastZone ? 1 : 2;
  const maxDays = isFastZone ? 2 : 4;
  const start = addBusinessDays(from, minDays);
  const end = addBusinessDays(from, maxDays);
  const label = `Get it by ${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
  return { start, end, label };
}
