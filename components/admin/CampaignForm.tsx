"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveCampaign } from "@/lib/admin/campaigns";
import { slugify } from "@/lib/utils";
import { utcIsoToSriLankaInputValue } from "@/lib/campaign-datetime";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import { SectionsEditor } from "@/components/admin/campaign-form/SectionsEditor";
import { ProductPickerModal } from "@/components/admin/campaign-form/ProductPickerModal";
import type { PickedVariant } from "@/components/admin/campaign-form/ProductPickerModal";
import { BulkApplyModal } from "@/components/admin/campaign-form/BulkApplyModal";
import type { BulkPickedVariant } from "@/components/admin/campaign-form/BulkApplyModal";
import { CampaignItemsTable } from "@/components/admin/campaign-form/CampaignItemsTable";
import { CampaignPreviewPanel } from "@/components/admin/campaign-form/CampaignPreviewPanel";
import { ChevronLeftIcon } from "@/components/ui/Icon";
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
  image: string | null;
}

// Admin-panel-only design language for this page (and the shared
// DateTimePicker it introduces) -- indigo accents, white cards over a light
// gray page background. Deliberately literal Tailwind utilities, not this
// app's --foreground/--color-nav-active-pill/etc tokens, so nothing here
// touches the customer-facing navy/orange brand palette.
const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const cardClass = "rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6";
const labelClass = "text-sm font-medium text-[var(--foreground)]";
const sectionHeadingClass = "text-lg font-bold text-[var(--foreground)]";
const sectionSubtitleClass = "text-sm text-[var(--muted)]";

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
    image: i.variant.image,
  }));
}

export function CampaignForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial: CampaignEditData | null;
  onSaved?: () => void;
  // Reuses whatever navigation the caller already has for "leave this
  // form" (CampaignsManager passes its existing setEditing(null) handler,
  // the same one its old standalone "← Back to campaigns" link used) --
  // no new routing/navigation logic introduced here.
  onCancel?: () => void;
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
  const [bulkApplyOpen, setBulkApplyOpen] = useState(false);
  const excludeCampaignId = initial?.campaign.id ?? null;

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
      image: p.image,
    }));
    setItems([...items, ...newItems]);
  }

  function handleBulkApplied(picks: BulkPickedVariant[]) {
    const newItems: ItemDraft[] = picks.map((p, i) => ({
      clientKey: crypto.randomUUID(),
      productId: p.productId,
      variantId: p.variantId,
      sectionClientKey: null,
      campaignPrice: p.campaignPrice,
      referencePriceSnapshot: p.salePrice ?? p.regularPrice,
      isActive: true,
      sortOrder: items.length + i,
      productName: p.productName,
      variantLabel: p.variantLabel,
      regularPrice: p.regularPrice,
      salePrice: p.salePrice,
      image: p.image,
    }));
    setItems([...items, ...newItems]);
  }

  const isEditing = initial != null;

  return (
    <div className="-m-6 min-h-[calc(100vh-4rem)] bg-gray-50 p-6">
      <form
        action={(formData) => {
          submittedRef.current = true;
          formAction(formData);
        }}
        className="mx-auto flex max-w-5xl flex-col gap-6"
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

        {/* 1. PAGE HEADER */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Back"
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                {isEditing ? "Edit Campaign" : "Create Campaign"}
              </h1>
              <p className="mt-0.5 text-sm text-[var(--muted)]">Set up your campaign details and schedule</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              name="status"
              value="draft"
              disabled={pending}
              className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save as Draft"}
            </button>
            <button
              type="submit"
              name="status"
              value="published"
              disabled={pending}
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Campaign"}
            </button>
          </div>
        </div>

        {state?.error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {/* 2. CAMPAIGN DETAILS */}
        <section className={`${cardClass} flex flex-col gap-5`}>
          <div>
            <h2 className={sectionHeadingClass}>Campaign Details</h2>
            <p className={sectionSubtitleClass}>Name, description, and how this campaign is promoted.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className={labelClass}>
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
            <div className="flex flex-col gap-1.5">
              <label htmlFor="slug" className={labelClass}>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} resize-none`}
              />
              <span className="self-end text-xs text-[var(--muted)]">{description.length} characters</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="promotionType" className={labelClass}>
                Promotion type
              </label>
              <select
                id="promotionType"
                name="promotionType"
                value={promotionType}
                onChange={(e) => setPromotionType(e.target.value as CampaignPromotionType)}
                className={inputClass}
              >
                <option value="product_discount">Product discount</option>
                <option value="flash_sale">Flash sale</option>
                <option value="free_shipping">Free shipping</option>
                <option value="coupon">Coupon</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3-5. SCHEDULE + DATE/TIME PICKER */}
        <section className={`${cardClass} flex flex-col gap-5`}>
          <div>
            <h2 className={sectionHeadingClass}>Schedule</h2>
            <p className={sectionSubtitleClass}>When this campaign goes live and (optionally) ends.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] p-4">
              <label htmlFor="startAt" className={labelClass}>
                Start
              </label>
              <DateTimePicker
                id="startAt"
                mode="datetime"
                name="startAt"
                value={startAt}
                onChange={setStartAt}
                required
                placeholder="Select start date & time"
                aria-label="Campaign start date and time"
              />
              <p className="text-xs text-[var(--muted)]">Sri Lanka time, UTC+5:30</p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] p-4">
              <label htmlFor="endAt" className={labelClass}>
                End
              </label>
              <DateTimePicker
                id="endAt"
                mode="datetime"
                name="endAt"
                value={endAt}
                onChange={setEndAt}
                placeholder="No end date"
                aria-label="Campaign end date and time"
              />
              <p className="text-xs text-[var(--muted)]">Sri Lanka time — optional</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="freeShippingEnabled"
              checked={freeShippingEnabled}
              onChange={(e) => setFreeShippingEnabled(e.target.checked)}
              className="h-4 w-4 accent-indigo-600"
            />
            Free shipping for orders containing items from this campaign
          </label>
        </section>

        {/* 6. MEDIA UPLOAD */}
        <section className={`${cardClass} flex flex-col gap-5`}>
          <div>
            <h2 className={sectionHeadingClass}>Media</h2>
            <p className={sectionSubtitleClass}>Banners and thumbnail shown across the storefront.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] p-4">
              <SingleImageUploader
                label="Desktop banner"
                name="desktopBannerUrl"
                value={desktopBannerUrl}
                onChange={setDesktopBannerUrl}
                hint="Recommended 1600×500"
              />
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <SingleImageUploader
                label="Mobile banner"
                name="mobileBannerUrl"
                value={mobileBannerUrl}
                onChange={setMobileBannerUrl}
                hint="Recommended 800×600"
              />
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4">
              <SingleImageUploader
                label="Thumbnail"
                name="thumbnailUrl"
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
                hint="Square, for homepage cards"
              />
            </div>
          </div>
        </section>

        {/* 7. SECTIONS */}
        <section className={`${cardClass} flex flex-col gap-4`}>
          <SectionsEditor sections={sections} onChange={setSections} />
        </section>

        {/* 8. PRODUCTS */}
        <section className={`${cardClass} flex flex-col gap-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={sectionHeadingClass}>Products</h2>
              <p className={sectionSubtitleClass}>Add the variants this campaign applies to.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkApplyOpen(true)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
              >
                + Bulk apply
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5"
              >
                + Add products
              </button>
            </div>
          </div>
          <CampaignItemsTable items={items} sections={sections} onChange={setItems} />
        </section>

        {pickerOpen && (
          <ProductPickerModal
            onClose={() => setPickerOpen(false)}
            onAdd={handlePicked}
            alreadyAddedVariantIds={new Set(items.map((i) => i.variantId))}
            excludeCampaignId={excludeCampaignId}
          />
        )}

        {bulkApplyOpen && (
          <BulkApplyModal
            onClose={() => setBulkApplyOpen(false)}
            onAdd={handleBulkApplied}
            alreadyAddedVariantIds={new Set(items.map((i) => i.variantId))}
          />
        )}

        <section className={`${cardClass} flex flex-col gap-4`}>
          <h2 className={sectionHeadingClass}>Display settings</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="showOnHomepage"
                checked={showOnHomepage}
                onChange={(e) => setShowOnHomepage(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Show on homepage
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="showInShop"
                checked={showInShop}
                onChange={(e) => setShowInShop(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Show in shop
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="showBadge"
                checked={showBadge}
                onChange={(e) => setShowBadge(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Show badge
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="showCountdown"
                checked={showCountdown}
                onChange={(e) => setShowCountdown(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              Show countdown
            </label>
          </div>
          {showBadge && (
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <label htmlFor="badgeLabel" className={labelClass}>
                Badge label
              </label>
              <input
                id="badgeLabel"
                name="badgeLabel"
                type="text"
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value)}
                placeholder="e.g. Flash Sale"
                className={inputClass}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="metaTitle" className={labelClass}>
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="metaDescription" className={labelClass}>
              Meta description (optional)
            </label>
            <textarea
              id="metaDescription"
              name="metaDescription"
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
        </section>

        <section className={`${cardClass} flex flex-col gap-4`}>
          <h2 className={sectionHeadingClass}>Preview</h2>
          <CampaignPreviewPanel
            name={name}
            desktopBannerUrl={desktopBannerUrl}
            sections={sections}
            items={items}
          />
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
          <button
            type="submit"
            name="status"
            value="draft"
            disabled={pending}
            className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save as Draft"}
          </button>
          <button
            type="submit"
            name="status"
            value="published"
            disabled={pending}
            className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
