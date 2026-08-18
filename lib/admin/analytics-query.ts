import { createClient } from "@/lib/supabase/server";
import { startOfSriLankaDay } from "@/lib/admin/dashboard-query";

// Plain createClient (not requireAdminClient) -- this is only ever called
// from app/admin/analytics/page.tsx, which already sits behind
// app/admin/layout.tsx's own auth/is_admin guard, same convention every
// other admin *page* data fetcher already follows (see
// lib/admin/dashboard-query.ts). RLS (sql/074_analytics_events.sql) is the
// actual security boundary, not this file.

export type AnalyticsRangeDays = 7 | 30 | 90;

const FUNNEL_STAGES: { eventType: string; label: string }[] = [
  { eventType: "PageView", label: "Page Views" },
  { eventType: "ViewContent", label: "Product Views" },
  { eventType: "AddToCart", label: "Added to Cart" },
  { eventType: "InitiateCheckout", label: "Checkouts Started" },
  { eventType: "Purchase", label: "Purchases" },
];

export interface ConversionFunnelStage {
  eventType: string;
  label: string;
  count: number;
  // % of the immediately-previous stage's count that reached this one --
  // null for the first stage, which has no "previous" to convert from.
  conversionFromPrevious: number | null;
}

export interface MarketingSourceRow {
  source: string;
  sessions: number;
  percent: number;
}

export interface AnalyticsData {
  rangeDays: AnalyticsRangeDays;
  rangeLabel: string;
  funnel: ConversionFunnelStage[];
  visitorSessions: number;
  ordersCount: number;
  // null (not 0) when there were no visitors at all in range -- "0%" would
  // wrongly imply real traffic that simply never converted.
  conversionRatePercent: number | null;
  marketingSources: MarketingSourceRow[];
  // True once there's been at least one PageView in range -- the "Not
  // enough data" empty state gates on this, not on the funnel/KPIs
  // individually (a real visitor count with zero purchases is still real
  // data, just a 0% funnel stage, not an empty page).
  hasEnoughData: boolean;
}

export async function getAnalyticsData(rangeDays: AnalyticsRangeDays = 30): Promise<AnalyticsData> {
  const supabase = await createClient();
  const now = new Date();
  const from = new Date(startOfSriLankaDay(now).getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString();

  const [funnelCounts, pageViewSessions, ordersCountResult, sourceRows] = await Promise.all([
    Promise.all(
      FUNNEL_STAGES.map(async (stage) => {
        const { count } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", stage.eventType)
          .gte("created_at", fromIso);
        return count ?? 0;
      }),
    ),
    supabase.from("events").select("session_id").eq("event_type", "PageView").gte("created_at", fromIso),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", fromIso),
    supabase.from("session_sources").select("source").gte("created_at", fromIso),
  ]);

  const funnel: ConversionFunnelStage[] = FUNNEL_STAGES.map((stage, i) => ({
    eventType: stage.eventType,
    label: stage.label,
    count: funnelCounts[i],
    conversionFromPrevious:
      i === 0 || funnelCounts[i - 1] === 0 ? null : (funnelCounts[i] / funnelCounts[i - 1]) * 100,
  }));

  const visitorSessions = new Set((pageViewSessions.data ?? []).map((row) => row.session_id)).size;
  const ordersCount = ordersCountResult.count ?? 0;
  const conversionRatePercent = visitorSessions > 0 ? (ordersCount / visitorSessions) * 100 : null;

  const sourceCounts = new Map<string, number>();
  for (const row of sourceRows.data ?? []) {
    sourceCounts.set(row.source, (sourceCounts.get(row.source) ?? 0) + 1);
  }
  const totalSourceSessions = [...sourceCounts.values()].reduce((sum, n) => sum + n, 0);
  const marketingSources: MarketingSourceRow[] = [...sourceCounts.entries()]
    .map(([source, sessions]) => ({
      source,
      sessions,
      percent: totalSourceSessions > 0 ? (sessions / totalSourceSessions) * 100 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  return {
    rangeDays,
    rangeLabel: `Last ${rangeDays} Days`,
    funnel,
    visitorSessions,
    ordersCount,
    conversionRatePercent,
    marketingSources,
    hasEnoughData: funnel[0].count > 0,
  };
}
