// Single source of truth for delivery rates, per the Cart Redesign (v11)
// Phase 0 request: "store the rates in one config file, not scattered
// across components." Confirmed with the user: the discounted tier is
// Colombo district only (not the wider "Western Province" definition
// this app used before) — Gampaha/Kalutara pay the standard rate.
//
// The Postgres function create_order_atomic (sql/027) can't import this
// file — its literal 255/400/'Colombo' values must be kept in sync with
// this file by hand if the rate ever changes again.

export const DISCOUNTED_RATE_DISTRICTS = ["Colombo"] as const;

export const RATE_IN_ZONE = 255;
export const RATE_OUTSIDE_ZONE = 400;

export type DeliveryMethod = "standard" | "pickup";

export function getDeliveryFee(district: string, deliveryMethod: DeliveryMethod): number {
  if (deliveryMethod === "pickup") return 0;
  return (DISCOUNTED_RATE_DISTRICTS as readonly string[]).includes(district)
    ? RATE_IN_ZONE
    : RATE_OUTSIDE_ZONE;
}
