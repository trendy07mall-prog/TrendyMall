import { BoltIcon } from "@/components/ui/Icon";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";

// The orange bar overlaid on the PDP gallery's main image when the
// resolved variant is genuinely on an active campaign price (see
// ProductGalleryWithVariants, which is the only caller and the only place
// that decides WHETHER to render this -- this component never checks
// eligibility itself, it just draws whatever it's handed).
//
// Moved here from the info column, where CampaignInfoBlock used to render
// the same three pieces of data (name/countdown/sold count) next to the
// price. That component is untouched and still renders unchanged for
// ProductCard -- this is a second, differently-styled presentation of the
// identical underlying data for this one new placement, not a
// replacement of CampaignInfoBlock itself.
export function GalleryCampaignBar({
  campaignName,
  campaignEndAt,
  soldCount,
}: {
  campaignName: string;
  campaignEndAt: string | null;
  soldCount: number | null;
}) {
  return (
    <div
      // --color-warning is this codebase's existing orange token (already
      // #F97316, already what CampaignInfoBlock's own campaign-name text
      // uses) -- reused as the fill here rather than a new literal, so a
      // future rebrand of that token moves this bar with it. Navy has no
      // existing sitewide token (only ones scoped to unrelated admin
      // components), so it's the literal hex the design calls for.
      //
      // items-start (not center): the campaign name can wrap to two lines
      // on a narrow viewport, and the countdown/sold-count column must
      // stay pinned to the top-right when that happens, not re-center
      // itself against a taller left column.
      className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-[var(--color-warning)] px-3 py-2 sm:px-4 sm:py-2.5"
    >
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-[#0F2D52] sm:text-base">
        <BoltIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
        {/* line-clamp-2, not truncate -- a long campaign name is allowed to
            wrap onto a second line rather than being cut off silently. */}
        <span className="line-clamp-2">{campaignName}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {campaignEndAt && (
          <CampaignCountdown target={campaignEndAt} label="Ends in" size="sm" tone="navy" />
        )}
        {/* Same "never shown as 0 or fabricated" rule CampaignInfoBlock
            already follows -- soldCount is only ever real data from
            getCampaignSoldCounts, and a null/zero count means nothing
            renders here rather than a fake "0 sold". */}
        {soldCount != null && soldCount > 0 && (
          <span className="text-[11px] font-medium text-[#0F2D52] sm:text-[13px]">
            {soldCount} sold
          </span>
        )}
      </span>
    </div>
  );
}
