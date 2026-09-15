import Image from "next/image";
import { BoltIcon } from "@/components/ui/Icon";
import { CampaignCountdown } from "@/components/marketing/CampaignCountdown";

// The campaign banner overlaid on the PDP gallery's main image when the
// resolved variant is genuinely on an active campaign price (see
// ProductGalleryWithVariants, the only caller and the only place that
// decides WHETHER to render this -- this component never checks
// eligibility itself, it just draws whatever it's handed).
//
// Two visual variants of the same underlying data, chosen purely on
// whether the campaign has an uploaded product_banner_url:
//   - imageUrl set:   the admin's image, with a dark scrim strip carrying
//                      the live name/countdown/sold-count in white.
//   - imageUrl null:  the original flat orange fill, navy text -- the
//                      fallback for any campaign published before this
//                      field existed. Not an error state; degrades
//                      gracefully rather than showing a broken layout.
export function GalleryCampaignBar({
  campaignName,
  campaignEndAt,
  soldCount,
  imageUrl,
}: {
  campaignName: string;
  campaignEndAt: string | null;
  soldCount: number | null;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    return (
      // Fixed height (not the flat bar's auto/py-driven height) because an
      // <Image fill> needs an explicit box to size against -- chosen to
      // land close to the flat bar's own natural height (~44px mobile,
      // ~52px desktop) so swapping between a campaign with an image and
      // one without doesn't visibly jump the layout. That fixed height is
      // also why the name truncates to one line here instead of the flat
      // bar's line-clamp-2 -- there's no room to grow into.
      <div className="absolute inset-x-0 top-0 h-11 overflow-hidden sm:h-14">
        <Image
          src={imageUrl}
          alt=""
          fill
          // Same breakpoint/coverage as the main product image directly
          // beneath this -- both are sized against the same container.
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        {/* Semi-transparent dark tint + white text, not a color picked
            per-upload -- it has to stay readable regardless of the uploaded
            image's colors, so this deliberately doesn't try to sample the
            image.

            NO backdrop-blur here, deliberately. This used to copy
            ProductCard's full glass recipe (bg-black/45 backdrop-blur-md
            backdrop-saturate-150), but the two aren't the same shape:
            ProductCard's strip is a thin py-1.5 band along the bottom edge
            of a product photo, so its blur only softens a sliver. This scrim
            is inset-0 over the ENTIRE banner, so backdrop-filter blurred
            100% of the admin's uploaded image, every time -- measured as
            blur(12px) saturate(1.5) on the scrim. The tint alone is what
            provides the contrast; the blur was never doing that job. */}
        <div className="absolute inset-0 flex items-center justify-between gap-2 bg-black/45 px-3 sm:px-4">
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-white sm:text-base">
            <BoltIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
            <span className="truncate">{campaignName}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            {campaignEndAt && (
              <CampaignCountdown target={campaignEndAt} label="Ends in" size="sm" tone="white" />
            )}
            {soldCount != null && soldCount > 0 && (
              <span className="text-[11px] font-medium text-white sm:text-[13px]">
                {soldCount} sold
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // No image on this campaign -- the original flat orange bar, unchanged
  // from before this ticket.
  return (
    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-[var(--color-warning)] px-3 py-2 sm:px-4 sm:py-2.5">
      <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-[#0F2D52] sm:text-base">
        <BoltIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" />
        <span className="line-clamp-2">{campaignName}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {campaignEndAt && (
          <CampaignCountdown target={campaignEndAt} label="Ends in" size="sm" tone="navy" />
        )}
        {soldCount != null && soldCount > 0 && (
          <span className="text-[11px] font-medium text-[#0F2D52] sm:text-[13px]">
            {soldCount} sold
          </span>
        )}
      </span>
    </div>
  );
}
