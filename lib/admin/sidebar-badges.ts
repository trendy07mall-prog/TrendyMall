import { createClient } from "@/lib/supabase/server";

export interface SidebarBadges {
  orders: number;
  reviews: number;
  campaigns: number;
}

// Three cheap head-count queries, real data only -- Orders = new/
// unprocessed (order_status='pending', same definition
// ADMIN_ORDER_TAB_STATUSES.new and OrderNewOrdersBanner already use),
// Reviews = pending moderation (needs an admin decision), Campaigns =
// currently active (same gating as getRunningCampaignsWithAnalytics,
// but a count only -- this runs on every admin page via the layout, not
// just the dashboard, so it deliberately doesn't fetch full campaign rows).
// Module-level rather than per-request, deliberately, and for the same
// reason proxy.ts caches the maintenance flag that way: the whole point is
// to survive ACROSS requests on a warm instance, so that clicking through
// five admin pages costs one set of counts instead of five.
//
// Safe to share between callers because there is nothing per-user in it --
// every admin sees the same three numbers -- and because the layout only
// reaches this after its is_admin gate, so a non-admin can never be the one
// who populates it. unstable_cache would have been the wrong tool: these
// read through the cookie-bound session client under RLS, which it forbids,
// and the public client would just return zeros.
//
// 30s of staleness on a "how many pending orders" badge is invisible in
// practice, and it self-corrects on the next navigation after the window.
const BADGES_TTL_MS = 30_000;
let badgesCache: { value: SidebarBadges; expiresAt: number } | null = null;

export async function getSidebarBadges(): Promise<SidebarBadges> {
  const cachedAt = Date.now();
  if (badgesCache && badgesCache.expiresAt > cachedAt) return badgesCache.value;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ count: orders }, { count: reviews }, { data: campaignRows }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_status", "pending"),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("campaigns")
      .select("end_at")
      .eq("status", "published")
      .eq("is_archived", false)
      .lte("start_at", nowIso),
  ]);

  const now = Date.now();
  const campaigns = (campaignRows ?? []).filter((c) => c.end_at == null || new Date(c.end_at).getTime() > now).length;

  const value = { orders: orders ?? 0, reviews: reviews ?? 0, campaigns };
  badgesCache = { value, expiresAt: Date.now() + BADGES_TTL_MS };
  return value;
}
