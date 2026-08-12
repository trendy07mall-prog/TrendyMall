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
export async function getSidebarBadges(): Promise<SidebarBadges> {
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

  return { orders: orders ?? 0, reviews: reviews ?? 0, campaigns };
}
