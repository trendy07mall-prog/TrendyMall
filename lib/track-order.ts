"use server";

import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types";

export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

export interface TrackOrderResult {
  order?: TrackedOrder;
  error?: string;
}

export async function trackOrder(
  orderNumber: string,
  phone: string,
): Promise<TrackOrderResult> {
  const trimmedNumber = orderNumber.trim();
  const trimmedPhone = phone.trim();
  if (!trimmedNumber || !trimmedPhone) {
    return { error: "Enter both your order number and phone number." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_order", {
    p_order_number: trimmedNumber,
    p_phone: trimmedPhone,
  });

  const row = data?.[0];
  if (error || !row) {
    return { error: "We couldn't find an order matching that number and phone." };
  }

  return {
    order: {
      orderNumber: row.order_number,
      status: row.status,
      total: row.total,
      createdAt: row.created_at,
    },
  };
}
