import { createClient } from "@/lib/supabase/server";
import { CampaignPerformanceTable } from "@/components/admin/finance/CampaignPerformanceTable";
import { getCampaignPerformance } from "@/lib/admin/campaign-analytics";
import { resolveFinanceRangeWindow } from "@/lib/admin/finance-query";
import { parseFinanceRangeState } from "@/lib/admin/finance-filters";

export default async function AdminFinanceCampaignPerformancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rangeState = parseFinanceRangeState(sp);
  const window = resolveFinanceRangeWindow(rangeState.range, rangeState.customFrom, rangeState.customTo);

  const supabase = await createClient();
  const rows = await getCampaignPerformance(supabase, window);

  return <CampaignPerformanceTable rows={rows} />;
}
