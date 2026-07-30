"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { GuestOrderDetail } from "@/types";

export interface TrackOrderResult {
  order?: GuestOrderDetail;
  error?: string;
}

async function getRequestIp(): Promise<string> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return hdrs.get("x-real-ip") ?? "unknown";
}

// order_number alone is short and human-readable ("TM-000123") — pairing
// it with the phone or email used at checkout (never order_number alone)
// is what stops anyone from enumerating other customers' orders. Rate
// limited by IP (check_guest_lookup_rate_limit, sql/033) before the real
// lookup ever runs, so a rejected attempt can't itself be used to probe
// how close a guess was.
export async function trackOrder(orderNumber: string, contact: string): Promise<TrackOrderResult> {
  const trimmedNumber = orderNumber.trim();
  const trimmedContact = contact.trim();
  if (!trimmedNumber || !trimmedContact) {
    return { error: "Enter both your order number and the phone or email you used." };
  }

  const supabase = await createClient();
  const ip = await getRequestIp();

  const { data: allowed, error: rateLimitError } = await supabase.rpc("check_guest_lookup_rate_limit", {
    p_ip: ip,
  });
  if (rateLimitError || !allowed) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const { data, error } = await supabase.rpc("track_order", {
    p_order_number: trimmedNumber,
    p_contact: trimmedContact,
  });

  const order = data as GuestOrderDetail | null;
  if (error || !order) {
    return { error: "We couldn't find an order matching that number and phone/email." };
  }

  return { order };
}
