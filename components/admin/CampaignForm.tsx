"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveCampaign } from "@/lib/admin/campaigns";
import { slugify } from "@/lib/utils";
import { utcIsoToSriLankaInputValue } from "@/lib/campaign-datetime";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import { SectionsEditor } from "@/components/admin/campaign-form/SectionsEditor";
import { ProductPickerModal } from "@/components/admin/campaign-form/ProductPickerModal";
import type { PickedVariant } from "@/components/admin/campaign-form/ProductPickerModal";
import { CampaignItemsTable } from "@/components/admin/campaign-form/CampaignItemsTable";
import { CampaignPreviewPanel } from "@/components/admin/campaign-form/CampaignPreviewPanel";
import type { CampaignEditData } from "@/lib/admin/campaigns-query";
import type { CampaignPromotionType } from "@/types";

export interface SectionDraft {
  clientKey: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ItemDraft {
  clientKey: string;
  productId: string;
  variantId: string;
  sectionClientKey: string | null;
  campaignPrice: number;
  referencePriceSnapshot: number | null;
  isActive: boolean;
  sortOrder: number;
  // Display-only, never sent as authoritative -- saveCampaign re-derives
  // ownership/price context server-side where it matters.
  productName: string;
  variantLabel: string;
  regularPrice: number;
  salePrice: number | null;
}

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

function buildInitialSections(initial: CampaignEditData | null): SectionDraft[] {
  return (initial?.sections ?? []).map((s) => ({
    clientKey: crypto.randomUUID(),
    name: s.name,
    sortOrder: s.sort_order,
    isActive: s.is_active,
  }));
}

function buildInitialItems(initial: CampaignEditData | null, sections: SectionDraft[]): ItemDraft[] {
  const sourceSections = initial?.sections ?? [];
  const clientKeyByDbId = new Map(sourceSections.map((s, i) => [s.id, sections[i].clientKey]));
  return (initial?.items ?? []).map((i) => ({
    clientKey: crypto.randomUUID(),
    productId: i.product_id,
    variantId: i.variant_id,
    sectionClientKey: i.section_id ? (clientKeyByDbId.get(i.section_id) ?? null) : null,
    campaignPrice: i.campaign_price,
    referencePriceSnapshot: i.reference_price_snapshot,
    isActive: i.is_active,
    sortOrder: i.sort_order,
    productName: i.product.name,
    variantLabel: i.variant.color_name ?? i.variant.sku ?? "Default",
    regularPrice: i.variant.regular_price,
    salePrice: i.variant.sale_price,
  }));
}

export function CampaignForm({
  initial,
  onSaved,
}: {
  initial: CampaignEditData | null;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveCampaign, undefined);

  // A plain `await formAction(fd); onSaved?.();` wrapper would call
  // onSaved unconditionally, closing the form and hiding a validation
  // error even on failure -- state inside that closure is always the
  // PRE-submission value, so it can't distinguish success from failure
  // in the same tick. This ref + effect waits for the real post-submit
  // state instead, and only closes the form when there was no error.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !state?.error) {
      submittedRef.current = false;
      onSaved?.();
    }
  }, [state, onSaved]);

  const [name, setName] = useState(initial?.campaign.name ?? "");
  const [slug, setSlug] = useState(initial?.campaign.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState(initial?.campaign.description ?? "");
  const [promotionType, setPromotionType] = useState<CampaignPromotionType>(
    initial?.campaign.promotion_type ?? "product_discount",
  );
  const [startAt, setStartAt] = useState(utcIsoToSriLankaInputValue(initial?.campaign.start_at ?? null));
  const [endAt, setEndAt] = useState(utcIsoToSriLankaInputValue(initial?.campaign.end_at ?? null));
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    initial?.campaign.free_shipping_enabled ?? false,
  );

  const [desktopBannerUrl, setDesktopBannerUrl] = useState(initial?.campaign.desktop_banner_url ?? null);
  const [mobileBannerUrl, setMobileBannerUrl] = useState(initial?.campaign.mobile_banner_url ?? null);
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.campaign.thumbnail_url ?? null);

  const [showOnHomepage, setShowOnHomepage] = useState(initial?.campaign.show_on_homepage ?? false);
  const [showInShop, setShowInShop] = useState(initial?.campaign.show_in_shop ?? false);
  const [showBadge, setShowBadge] = useState(initial?.campaign.show_badge ?? false);
  const [badgeLabel, setBadgeLabel] = useState(initial?.campaign.badge_label ?? "");
  const [showCountdown, setShowCountdown] = useState(initial?.campaign.show_countdown ?? false);
  const [metaTitle, setMetaTitle] = useState(initial?.campaign.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.campaign.meta_description ?? "");

  const [sections, setSections] = useState<SectionDraft[]>(() => buildInitialSections(initial));
  const [items, setItems] = useState<ItemDraft[]>(() => buildInitialItems(initial, sections));
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handlePicked(picks: PickedVariant[]) {
    const newItems: ItemDraft[] = picks.map((p, i) => ({
      clientKey: crypto.randomUUID(),
      productId: p.productId,
      variantId: p.variantId,
      sectionClientKey: null,
      campaignPrice: p.salePrice ?? p.regularPrice,
      referencePriceSnapshot: p.salePrice ?? p.regularPrice,
      isActive: true,
      sortOrder: items.length + i,
      productName: p.productName,
      variantLabel: p.variantLabel,
      regularPrice: p.regularPrice,
      salePrice: p.salePrice,
    }));
    setItems([...items, ...newItems]);
  }

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-8"
    >
      <input type="hidden" name="id" defaultValue={initial?.campaign.id ?? ""} />
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />
      <input
        type="hidden"
        name="campaignItems"
        value={JSON.stringify(
          items.map((i) => ({
            clientKey: i.clientKey,
            productId: i.productId,
            variantId: i.variantId,
            sectionClientKey: i.sectionClientKey,
            campaignPrice: i.campaignPrice,
            referencePriceSnapshot: i.referencePriceSnapshot,
            isActive: i.isActive,
            sortOrder: i.sortOrder,
          })),
        )}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Basic info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="slug" className="text-sm font-medium">
              Slug
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="promotionType" className="text-sm font-medium">
            Promotion type
          </label>
          <select
            id="promotionType"
            name="promotionType"
            value={promotionType}
            onChange={(e) => setPromotionType(e.target.value as CampaignPromotionType)}
            className={`${inputClass} max-w-xs`}
          >
            <option value="product_discount">Product discount</option>
            <option value="flash_sale">Flash sale</option>
            <option value="free_shipping">Free shipping</option>
            <option value="coupon">Coupon</option>
          </select>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Schedule</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="startAt" className="text-sm font-medium">
              Start (Sri Lanka time, UTC+5:30)
            </label>
            <input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="endAt" className="text-sm font-medium">
              End (Sri Lanka time — optional)
            </label>
            <input
              id="endAt"
              name="endAt"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="freeShippingEnabled"
            checked={freeShippingEnabled}
            onChange={(e) => setFreeShippingEnabled(e.target.checked)}
          />
          Free shipping for orders containing items from this campaign
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Images</h2>
        <div className="grid grid-cols-3 gap-4">
          <SingleImageUploader
            label="Desktop banner"
            name="desktopBannerUrl"
            value={desktopBannerUrl}
            onChange={setDesktopBannerUrl}
            hint="Recommended 1600×500"
          />
          <SingleImageUploader
            label="Mobile banner"
            name="mobileBannerUrl"
            value={mobileBannerUrl}
            onChange={setMobileBannerUrl}
            hint="Recommended 800×600"
          />
          <SingleImageUploader
            label="Thumbnail"
            name="thumbnailUrl"
            value={thumbnailUrl}
            onChange={setThumbnailUrl}
            hint="Square, for homepage cards"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionsEditor sections={sections} onChange={setSections} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Products</h2>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="transition-brand rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            + Add products
          </button>
        </div>
        <CampaignItemsTable items={items} sections={sections} onChange={setItems} />
      </section>

      {pickerOpen && (
        <ProductPickerModal
          onClose={() => setPickerOpen(false)}
          onAdd={handlePicked}
          alreadyAddedVariantIds={new Set(items.map((i) => i.variantId))}
        />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Display settings</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="showOnHomepage"
              checked={showOnHomepage}
              onChange={(e) => setShowOnHomepage(e.target.checked)}
            />
            Show on homepage
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="showInShop"
              checked={showInShop}
              onChange={(e) => setShowInShop(e.target.checked)}
            />
            Show in shop
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="showBadge"
              checked={showBadge}
              onChange={(e) => setShowBadge(e.target.checked)}
            />
            Show badge
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="showCountdown"
              checked={showCountdown}
              onChange={(e) => setShowCountdown(e.target.checked)}
            />
            Show countdown
          </label>
        </div>
        {showBadge && (
          <div className="flex flex-col gap-1">
            <label htmlFor="badgeLabel" className="text-sm font-medium">
              Badge label
            </label>
            <input
              id="badgeLabel"
              name="badgeLabel"
              type="text"
              value={badgeLabel}
              onChange={(e) => setBadgeLabel(e.target.value)}
              placeholder="e.g. Flash Sale"
              className={`${inputClass} max-w-xs`}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="metaTitle" className="text-sm font-medium">
            Meta title (optional)
          </label>
          <input
            id="metaTitle"
            name="metaTitle"
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="metaDescription" className="text-sm font-medium">
            Meta description (optional)
          </label>
          <textarea
            id="metaDescription"
            name="metaDescription"
            rows={2}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className={inputClass}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Preview</h2>
        <CampaignPreviewPanel
          name={name}
          desktopBannerUrl={desktopBannerUrl}
          sections={sections}
          items={items}
        />
      </section>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          name="status"
          value="draft"
          disabled={pending}
          className="transition-brand rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save as Draft"}
        </button>
        <button
          type="submit"
          name="status"
          value="published"
          disabled={pending}
          className="transition-brand rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
