"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendNewSubscriberNotification } from "@/lib/email";
import { getNotificationSettings } from "@/lib/data/settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/utils";

export interface SubscribeResult {
  ok?: boolean;
  alreadySubscribed?: boolean;
  error?: string;
}

// honeypot: same "company" field name/pattern as lib/contact.ts and
// signup() (app/auth/actions.ts) — a real visitor never fills it, so a
// non-empty value gets a fake success with no insert and no owner-
// notification email sent.
export async function subscribe(email: string, honeypot?: string): Promise<SubscribeResult> {
  if (honeypot && honeypot.trim()) return { ok: true };

  // Lowercased before insert so "Foo@x.com" and "foo@x.com" can't slip
  // past the unique constraint as two different subscribers.
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Enter your email address." };
  if (!isValidEmail(trimmed)) return { error: "Enter a valid email address." };

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  const allowed = checkRateLimit(`newsletter:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 });
  if (!allowed) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("subscribers").insert({ email: trimmed });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, alreadySubscribed: true };
    }
    return { error: "Could not subscribe. Please try again." };
  }

  // Best-effort, never blocks the subscription itself.
  try {
    const notifications = await getNotificationSettings();
    if (notifications.newSubscriberEnabled) {
      await sendNewSubscriberNotification({ email: trimmed });
    }
  } catch (notifyError) {
    console.error("subscribe: owner notification failed (subscription itself already saved)", notifyError);
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
