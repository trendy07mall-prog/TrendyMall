"use client";

import Image from "next/image";
import { CampaignPreviewCard } from "@/components/admin/campaign-form/CampaignPreviewCard";
import type { ItemDraft, SectionDraft } from "@/components/admin/CampaignForm";

// A simple in-editor approximation, not the real campaign landing page
// (that route doesn't exist until a later phase) -- built so it can be
// swapped for an embed of the real page later without reworking this form.
export function CampaignPreviewPanel({
  name,
  desktopBannerUrl,
  sections,
  items,
}: {
  name: string;
  desktopBannerUrl: string | null;
  sections: SectionDraft[];
  items: ItemDraft[];
}) {
  const sectioned = sections
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      section,
      items: items.filter((i) => i.sectionClientKey === section.clientKey),
    }));
  const unsectioned = items.filter((i) => i.sectionClientKey == null);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
      {desktopBannerUrl ? (
        <span className="relative block aspect-[1200/400] w-full overflow-hidden rounded-[var(--radius-sm)]">
          <Image src={desktopBannerUrl} alt="" fill sizes="800px" className="object-cover" />
        </span>
      ) : (
        <div className="flex aspect-[1200/400] w-full items-center justify-center rounded-[var(--radius-sm)] bg-black/5 text-sm text-[var(--muted)]">
          No banner uploaded
        </div>
      )}
      <h3 className="mt-4 text-xl font-bold">{name || "Untitled campaign"}</h3>

      {items.length === 0 && (
        <p className="mt-4 text-sm text-[var(--muted)]">Add products to see them here.</p>
      )}

      {sectioned.map(
        ({ section, items: sectionItems }) =>
          sectionItems.length > 0 && (
            <div key={section.clientKey} className="mt-6">
              <h4 className="text-sm font-semibold">{section.name || "(unnamed section)"}</h4>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {sectionItems.map((item) => (
                  <CampaignPreviewCard
                    key={item.clientKey}
                    name={item.productName}
                    regularPrice={item.salePrice ?? item.regularPrice}
                    campaignPrice={item.campaignPrice}
                  />
                ))}
              </div>
            </div>
          ),
      )}

      {unsectioned.length > 0 && (
        <div className="mt-6">
          {sectioned.some((s) => s.items.length > 0) && (
            <h4 className="text-sm font-semibold">More</h4>
          )}
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {unsectioned.map((item) => (
              <CampaignPreviewCard
                key={item.clientKey}
                name={item.productName}
                regularPrice={item.salePrice ?? item.regularPrice}
                campaignPrice={item.campaignPrice}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
