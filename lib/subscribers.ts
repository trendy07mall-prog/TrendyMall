"use server";

import { createClient } from "@/lib/supabase/server";

export interface SubscribeResult {
  ok?: boolean;
  alreadySubscribed?: boolean;
  error?: string;
}

export async function subscribe(email: string): Promise<SubscribeResult> {
  // Lowercased before insert so "Foo@x.com" and "foo@x.com" can't slip
  // past the unique constraint as two different subscribers.
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Enter your email address." };

  const supabase = await createClient();
  const { error } = await supabase.from("subscribers").insert({ email: trimmed });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, alreadySubscribed: true };
    }
    return { error: "Could not subscribe. Please try again." };
  }

  return { ok: true };
}

// Lets a logged-in customer's newsletter form show "already subscribed"
// proactively, with no typing/submission needed. subscribers SELECT is
// admin-only under RLS, so this goes through a narrow RPC that only ever
// checks the caller's own authenticated email — see sql/044.
export async function checkMySubscription(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_my_email_subscribed");
  if (error) return false;
  return Boolean(data);
}
