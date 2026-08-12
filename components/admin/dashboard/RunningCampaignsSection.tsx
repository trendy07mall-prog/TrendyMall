import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { BadgePercentIcon } from "@/components/ui/Icon";
import type { RunningCampaign } from "@/lib/admin/campaign-analytics";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function RunningCampaignsSection({ campaigns }: { campaigns: RunningCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] px-6 py-12 text-center">
        <BadgePercentIcon className="h-8 w-8 text-[var(--color-text-secondary)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">No campaigns are currently running.</p>
        <Link
          href="/admin/campaigns"
          className="rounded-[var(--radius-md)] bg-[#0F2D52] px-5 py-2.5 text-sm font-medium text-white transition-brand hover:opacity-90"
        >
          Create Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <Link
          key={campaign.id}
          href="/admin/campaigns"
          className="transition-brand flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]"
        >
          <div className="relative aspect-[2/1] w-full bg-black/5">
            {campaign.desktop_banner_url || campaign.thumbnail_url ? (
              <Image
                src={(campaign.desktop_banner_url || campaign.thumbnail_url) as string}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BadgePercentIcon className="h-8 w-8 text-[var(--color-text-secondary)]" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <p className="font-semibold">{campaign.name}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {formatDate(campaign.start_at)} – {campaign.end_at ? formatDate(campaign.end_at) : "No end date"}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {campaign.itemCount} product{campaign.itemCount === 1 ? "" : "s"}
            </p>
            <div className="mt-auto flex items-center gap-4 border-t border-[var(--border)] pt-2 text-sm">
              <span>
                <span className="font-semibold">{campaign.orderCount}</span>{" "}
                <span className="text-[var(--color-text-secondary)]">orders</span>
              </span>
              <span>
                <span className="font-semibold">{formatPrice(campaign.revenue)}</span>{" "}
                <span className="text-[var(--color-text-secondary)]">sales</span>
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
