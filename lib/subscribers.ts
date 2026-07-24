"use server";

import { createClient } from "@/lib/supabase/server";

export interface SubscribeResult {
  ok?: boolean;
  error?: string;
}

export async function subscribe(email: string): Promise<SubscribeResult> {
  const trimmed = email.trim();
  if (!trimmed) return { error: "Enter your email address." };

  const supabase = await createClient();
  const { error } = await supabase.from("subscribers").insert({ email: trimmed });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    return { error: "Could not subscribe. Please try again." };
  }

  return { ok: true };
}
