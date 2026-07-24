"use server";

import { createClient } from "@/lib/supabase/server";

export interface RequestStockNotificationResult {
  ok?: boolean;
  error?: string;
}

export async function requestStockNotification(
  productId: string,
  email: string,
): Promise<RequestStockNotificationResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return { error: "Enter your email address." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_stock_notifications")
    .insert({ product_id: productId, email: trimmedEmail });

  if (error) return { error: "Could not save your request. Please try again." };
  return { ok: true };
}
