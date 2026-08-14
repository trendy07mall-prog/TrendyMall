"use server";

import { createClient } from "@/lib/supabase/server";
import type { DeliveryZone } from "@/lib/delivery-fee";

// "use server" (not the plain lib/data/*.ts convention Phases 1-2 used) —
// this needs to be directly callable from client components too:
// app/cart/page.tsx is itself "use client" and already fetches other
// server data this same way (see lib/cart-validation.ts's
// getCartValidation/getCartFreeShipping). Server Components can still
// call this directly like any other async function, so nothing changes
// for the server-side callers (checkout/page.tsx, email.ts, invoice
// generation, etc.).
export async function getActiveDeliveryZones(): Promise<DeliveryZone[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, name, postal_code_start, postal_code_end, district_match, rate, is_default")
    .eq("status", "active")
    .order("sort_order");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    postalCodeStart: row.postal_code_start,
    postalCodeEnd: row.postal_code_end,
    districtMatch: row.district_match,
    rate: row.rate,
    isDefault: row.is_default,
  }));
}
