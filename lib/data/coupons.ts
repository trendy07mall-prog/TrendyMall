import { createClient } from "@/lib/supabase/server";
import type { Coupon } from "@/types";

// Same "active and currently valid" condition both callers need: is_active,
// and — if set — within its start/expiry window. Neither function trusts
// this for pricing; it's display-only (server-side create_order_atomic
// re-validates everything at checkout, sql/026/042).
function withValidityWindow<T>(query: T) {
  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
}

// The single coupon the homepage's Coupons card features — soonest expiry
// first (creates real urgency, and never gets stale the way "highest
// discount" could if a big one-off coupon is left active for months).
export async function getFeaturedCoupon(): Promise<Coupon | null> {
  const supabase = await createClient();
  const { data, error } = await withValidityWindow(
    supabase.from("coupons").select("*"),
  )
    .order("expires_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Every currently-valid coupon, for the /coupons page — soonest expiry
// first, matching the homepage card's own ordering.
export async function getActiveCoupons(): Promise<Coupon[]> {
  const supabase = await createClient();
  const { data, error } = await withValidityWindow(
    supabase.from("coupons").select("*"),
  ).order("expires_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data ?? [];
}
