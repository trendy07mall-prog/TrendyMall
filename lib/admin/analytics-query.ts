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
  // Guaranteed <= 100 by construction (see getAnalyticsData) -- never a
  // derived value that could exceed it.
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
  // The funnel's own last-stage count (sessions that reached Purchase),
  // not a raw count of `orders` rows -- see conversionRatePercent's comment
  // for why mixing those two sources produced nonsense (>100%) before.
  purchaseSessions: number;
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

  // One distinct-session-id set per stage, not a raw event count -- a
  // single session reloading /checkout five times (five InitiateCheckout
  // rows) or clicking "Add to Cart" on three products (three AddToCart
  // rows) must still only ever count as ONE session at that stage. Raw
  // event counts don't have that property, which is exactly what let a
  // later stage's count exceed an earlier one before this fix.
  const stageSessionSets = await Promise.all(
    FUNNEL_STAGES.map(async (stage) => {
      const { data } = await supabase
        .from("events")
        .select("session_id")
        .eq("event_type", stage.eventType)
        .gte("created_at", fromIso);
      return new Set((data ?? []).map((row) => row.session_id));
    }),
  );

  const [sourceRows] = await Promise.all([
    supabase.from("session_sources").select("source").gte("created_at", fromIso),
  ]);

  // Each stage is intersected with the RUNNING set from every stage before
  // it -- a proper cumulative funnel (sessions that reached this stage AND
  // every stage before it), not five independent totals. Intersection can
  // only ever shrink or stay the same size, so funnel[i].count <=
  // funnel[i-1].count is a mathematical guarantee here, not something that
  // just usually holds in practice.
  let runningSessions: Set<string> | null = null;
  const stageCounts: number[] = stageSessionSets.map((stageSet) => {
    runningSessions =
      runningSessions === null
        ? stageSet
        : new Set([...runningSessions].filter((id) => stageSet.has(id)));
    return runningSessions.size;
  });

  const funnel: ConversionFunnelStage[] = FUNNEL_STAGES.map((stage, i) => ({
    eventType: stage.eventType,
    label: stage.label,
    count: stageCounts[i],
    conversionFromPrevious: i === 0 || stageCounts[i - 1] === 0 ? null : (stageCounts[i] / stageCounts[i - 1]) * 100,
  }));

  const visitorSessions = stageCounts[0];
  const purchaseSessions = stageCounts[stageCounts.length - 1];
  // Deliberately funnel-derived, not a count of `orders` rows in range --
  // `orders` includes every historical order ever placed (including
  // everything before this tracking existed), while `visitorSessions` only
  // reflects sessions since the tracking cookie went live. Dividing one by
  // the other produced a >100% "conversion rate." Both sides of this
  // division now come from the exact same source (events, same date
  // range), so the result can never exceed 100%.
  const conversionRatePercent = visitorSessions > 0 ? (purchaseSessions / visitorSessions) * 100 : null;

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
    purchaseSessions,
    conversionRatePercent,
    marketingSources,
    hasEnoughData: funnel[0].count > 0,
  };
}
