"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const SESSION_COOKIE = "tm_session_id";

const ALLOWED_EVENT_TYPES = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "Purchase",
]);

export interface LogEventInput {
  eventType: string;
  pagePath: string;
  productId?: string | null;
  value?: number | null;
}

// First-party conversion logging -- feeds /admin/analytics' Conversion
// Funnel/Rate and Marketing Sources sections. Deliberately independent of
// the Meta Pixel (see lib/analytics/track.ts, which calls both from the
// same call site but never lets one affect the other): the session_id
// cookie this reads is anonymous, minted by proxy.ts before any auth
// exists, and carries no PII. Every write goes through the service-role
// client -- there is no public insert policy on `events` (sql/074), so a
// visitor's browser could never write here directly even if it tried.
export async function logEvent(input: LogEventInput): Promise<void> {
  if (!ALLOWED_EVENT_TYPES.has(input.eventType)) return;

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  // proxy.ts mints this on every request before a page ever renders --
  // missing here would mean proxy.ts didn't run (e.g. a route excluded by
  // its matcher). Fails silently rather than logging a sessionless row.
  if (!sessionId) return;

  try {
    const supabase = createAdminClient();
    await supabase.from("events").insert({
      event_type: input.eventType,
      page_path: input.pagePath.slice(0, 500),
      product_id: input.productId ?? null,
      session_id: sessionId,
      value: input.value ?? null,
    });
  } catch {
    // Analytics logging must never surface as a user-facing error --
    // callers already treat this as fire-and-forget (lib/analytics/track.ts),
    // but a transient DB/network error is swallowed here too, defensively.
  }
}
