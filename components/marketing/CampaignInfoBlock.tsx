import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";

// Shared by ProductCard (compact) and ProductPurchaseSection (full) so both
// surfaces render campaign info identically -- reuses --color-warning (the
// token the existing badge pill already established for campaign UI) and
// CampaignCountdown unchanged (it already re-verifies via router.refresh()
// at zero rather than freezing, so "the server stays the authority" needs
// no new code here). soldCount is display-only and intentionally omitted
// (never shown as 0 or fabricated) whenever the caller couldn't compute it.
export function CampaignInfoBlock({
  campaignName,
  campaignEndAt,
  soldCount,
  compact = false,
}: {
  campaignName: string;
  campaignEndAt: string | null;
  soldCount: number | null;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-center ${compact ? "gap-x-2 gap-y-0.5" : "gap-x-3 gap-y-1"}`}>
      <span
        className={`flex items-center gap-1 font-semibold text-[var(--color-warning)] ${
          compact ? "text-xs" : "text-base"
        }`}
      >
        <span aria-hidden="true">⚡</span>
        <span className={compact ? "line-clamp-1" : ""}>{campaignName}</span>
      </span>
      {campaignEndAt && <CampaignCountdown target={campaignEndAt} label="Ends in" />}
      {soldCount != null && soldCount > 0 && (
        <span className={`text-[var(--muted)] ${compact ? "text-[11px]" : "text-sm"}`}>{soldCount} sold</span>
      )}
    </div>
  );
}
