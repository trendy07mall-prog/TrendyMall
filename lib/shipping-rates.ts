// Single source of truth for delivery rates.
//
// Checkout Redesign (v12) Phase 0: pricing keys off the CITY (a specific
// Colombo postal zone, "Colombo 01".."Colombo 15") rather than the
// district. The previous district-based rule ("Colombo" district = the
// discounted rate) was a real, live pricing bug — Colombo District also
// contains Dehiwala, Moratuwa, Kaduwela, Homagama, Maharagama, etc., all of
// which were being incorrectly charged the discounted rate. The district
// dropdown stays in address forms for completeness, but must never again
// be read for pricing.
//
// The Postgres function create_order_atomic (sql/029) can't import this
// file — its equivalent regex match must be kept in sync with
// isColomboZone below if the rule ever changes again.

export const RATE_IN_ZONE = 255;
export const RATE_OUTSIDE_ZONE = 400;

export type DeliveryMethod = "standard" | "pickup";

// Matches "Colombo 01".."Colombo 15" tolerantly — optional space/dash
// between "Colombo" and the number, optional leading zero, case
// insensitive — so a slightly different free-text format (a customer
// typing "colombo-5" instead of picking "Colombo 05" from the list) still
// prices correctly. A bare "Colombo" with no zone number does NOT match,
// by design: that's the ambiguous input that caused the original bug.
const COLOMBO_ZONE_PATTERN = /^colombo\s*-?\s*0*([1-9]|1[0-5])$/i;

export function isColomboZone(city: string): boolean {
  return COLOMBO_ZONE_PATTERN.test(city.trim());
}

export function getDeliveryFee(city: string, deliveryMethod: DeliveryMethod): number {
  if (deliveryMethod === "pickup") return 0;
  return isColomboZone(city) ? RATE_IN_ZONE : RATE_OUTSIDE_ZONE;
}
