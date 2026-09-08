"use client";

import { useActionState, useCallback, useState, startTransition } from "react";
import dynamic from "next/dynamic";
import type {
  Attribute,
  AttributeValue,
  Brand,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  SpecField,
  SpecTemplate,
  Tag,
} from "@/types";
import type { ProductFormState } from "@/lib/admin/products";
import { CategoryField } from "./product-form/CategoryField";
import { BrandField } from "./product-form/BrandField";
import { TagsField } from "./product-form/TagsField";
import { AttributesField } from "./product-form/AttributesField";
import { SpecFieldsEditor } from "./product-form/SpecFieldsEditor";
import { VariantsEditor, BLANK_VARIANT_DRAFT, type VariantDraft } from "./product-form/VariantsEditor";
import { WhatsInBoxEditor } from "./product-form/WhatsInBoxEditor";
import { GalleryUploader } from "./product-form/GalleryUploader";
import { FormSection } from "./product-form/FormSection";
import { ProgressStrip, type SectionProgress } from "./product-form/ProgressStrip";

// Tiptap/ProseMirror constructs real DOM structures when the editor is
// instantiated, which isn't safe during Next.js's server-side render pass of
// this client component's initial HTML — load it browser-only.
const RichTextEditor = dynamic(
  () => import("./product-form/RichTextEditor").then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Description</label>
        <div className="h-40 animate-pulse rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/5" />
      </div>
    ),
  },
);

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--pf-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--pf-navy)]";

export function ProductForm({
  categories,
  brands,
  tags,
  templatesWithFields,
  attributesWithValues,
  product,
  images,
  variants,
  defaultTagIds = [],
  defaultSpecValues = {},
  defaultAttributeValueIds = [],
  action,
}: {
  categories: Category[];
  brands: Brand[];
  tags: Tag[];
  templatesWithFields: { template: SpecTemplate; fields: SpecField[] }[];
  attributesWithValues: { attribute: Attribute; values: AttributeValue[] }[];
  product?: Product;
  images?: ProductImage[];
  variants?: (ProductVariant & { imageUrls: string[]; attributeValueIds: string[] })[];
  defaultTagIds?: string[];
  defaultSpecValues?: Record<string, string>;
  defaultAttributeValueIds?: string[];
  action: (
    state: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [whatsInBox, setWhatsInBox] = useState<string[]>(
    product?.whats_in_box ?? [],
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    (images ?? []).map((i) => i.image_url),
  );
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>(() => {
    const existing = (variants ?? []).map((v) => ({
      id: v.id,
      colorName: v.color_name ?? "",
      colorHex: v.color_hex ?? "",
      stock: v.stock?.toString() ?? "",
      regularPrice: v.regular_price?.toString() ?? "",
      salePrice: v.sale_price?.toString() ?? "",
      sku: v.sku ?? "",
      imageUrls: v.imageUrls,
      attributeValueIds: v.attributeValueIds,
    }));
    // A brand-new product (or, defensively, an existing one somehow saved
    // with zero variants) starts with one blank row rather than an empty
    // section -- every product needs at least one variant to hold its
    // price now, so this is what makes that requirement visible from the
    // start instead of only surfacing as a save-time error.
    return existing.length > 0 ? existing : [{ ...BLANK_VARIANT_DRAFT }];
  });
  const [attributeValueIds, setAttributeValueIds] = useState<string[]>(defaultAttributeValueIds);

  // Only non-color attributes can define a variant combination -- Color
  // stays sourced from the variant rows themselves (see VariantsEditor).
  const checkedNonColorAttributes = attributesWithValues
    .filter((g) => g.attribute.slug !== "color")
    .map((g) => ({
      attribute: g.attribute,
      values: g.values.filter((v) => attributeValueIds.includes(v.id)),
    }))
    .filter((g) => g.values.length > 0);

  // --- progress strip / status bar readouts ----------------------------
  //
  // Everything below observes the form; none of it constrains it. No field
  // became required, no submit is gated, and the server still decides.

  const [activeSection, setActiveSection] = useState<string | null>(null);
  // Every SKU the live check has come back on, and what it said. Keyed by
  // the SKU string rather than by row index so removing or reordering
  // variant rows needs no bookkeeping here -- whether a conflict is live is
  // re-derived below from the rows that actually exist right now.
  const [skuVerdicts, setSkuVerdicts] = useState<Record<string, boolean>>({});
  const handleSkuChecked = useCallback((sku: string, taken: boolean) => {
    setSkuVerdicts((prev) => (prev[sku] === taken ? prev : { ...prev, [sku]: taken }));
  }, []);
  const skuConflict = variantDrafts.some((row) => skuVerdicts[row.sku.trim()]);
  // `name` and `stock` are the two required fields that stayed
  // uncontrolled, and they must stay that way -- making them controlled is
  // what the form-reset fix in onSubmit deliberately avoids needing. So
  // their filled-ness is read off the DOM on input instead of mirrored
  // into state.
  const [requiredFilled, setRequiredFilled] = useState(() => ({
    name: Boolean(product?.name),
    stock: product?.stock != null,
  }));

  // Attached to the two inputs themselves, NOT to the form.
  //
  // A form-level onInput fires for every control in the form, <select>s
  // included, and the re-render it queued landed between a select's
  // `input` and `change` events. React re-applies a controlled <select>'s
  // value on every commit (it re-syncs the option list, unlike <input>,
  // where it only writes when the value prop changes), so the DOM reverted
  // to the pre-selection value and `change` then read that stale value
  // back -- making it impossible to choose a brand at all.
  function syncRequiredFilled(event: React.FormEvent<HTMLInputElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const named = (fieldName: string) =>
      (form.elements.namedItem(fieldName) as HTMLInputElement | null)?.value.trim() ?? "";
    const next = { name: named("name") !== "", stock: named("stock") !== "" };
    // Same object back unless something actually flipped: this readout is
    // consulted on every render but changes on almost no keystroke, and a
    // fresh object each time would re-render the whole form per character.
    setRequiredFilled((prev) =>
      prev.name === next.name && prev.stock === next.stock ? prev : next,
    );
  }

  const hasAttributes = attributesWithValues.some((g) => g.values.length > 0);

  const sections: SectionProgress[] = [
    {
      id: "category-details",
      label: "Category details",
      complete: categoryId !== "" && requiredFilled.name && requiredFilled.stock,
    },
    // Dropped entirely when the catalog has no attribute values to pick --
    // a step that can never be reached is worse than no step at all.
    ...(hasAttributes
      ? [
          {
            id: "product-attributes",
            label: "Product attributes",
            // This section has no required fields, so "complete" can only
            // mean "the admin made a choice here". Leaving it empty is
            // still a perfectly valid save.
            complete: attributeValueIds.length > 0,
          },
        ]
      : []),
    {
      id: "variants-pricing",
      // Regular price is the one required field per row, matching the
      // `required` already on that input.
      label: "Variants & pricing",
      complete:
        variantDrafts.length > 0 &&
        variantDrafts.every((row) => row.regularPrice.trim() !== ""),
    },
  ];

  const completeCount = sections.filter((s) => s.complete).length;
  // Stated, not demanded: the live SKU check is informational and the
  // submit stays enabled through it, so this must not imply a block the
  // button doesn't actually enforce. The unique index is still the only
  // thing that decides, at save time.
  const statusText = skuConflict
    ? "This SKU is already in use"
    : completeCount + " of " + sections.length + " sections complete";

  return (
    <form
      // Submitted by handing the FormData to the action inside a
      // transition, rather than via action={formAction} directly.
      //
      // React 19 resets a form automatically once its action completes --
      // including when the action came back with an error. That wiped
      // every uncontrolled field here (name, slug, SKU, stock, keywords,
      // the SEO fields, the spec fields) on a failed submit, so a
      // duplicate-SKU error meant retyping the whole product. Making those
      // fields controlled would not have fixed it either: the brand select
      // already is controlled and still cleared, because the reset happens
      // to the DOM without React's knowledge and React only rewrites a
      // field when its value prop CHANGES between renders.
      //
      // Calling the action programmatically skips that automatic reset
      // entirely, so nothing the user typed is touched on error. Native
      // validation is unaffected: the browser only fires submit once the
      // form's own required/type constraints pass, exactly as before.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      // Read-only observer feeding the progress strip. onFocus stands in
      // for focusin (React delegates it, so it bubbles) to tell which
      // section the admin is working in. Safe at form level where onInput
      // was not: focus fires before a select's input/change pair rather
      // than between them, and setting the same section id back is a
      // no-op React bails out of.
      onFocus={(event) => {
        const section = (event.target as HTMLElement).closest?.("[data-section]");
        setActiveSection(section?.getAttribute("data-section") ?? null);
      }}
      className="product-form mt-6 flex flex-col"
    >
      <ProgressStrip sections={sections} activeId={activeSection} />

      <div className="overflow-visible rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--color-card)] shadow-[var(--pf-card-shadow)]">
        <FormSection
          id="category-details"
          title="Category details"
          description="Where this product lives in the catalog, and how it is identified."
        >
          <CategoryField categories={categories} value={categoryId} onChange={setCategoryId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={product?.name}
                required
                onInput={syncRequiredFilled}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="slug" className="text-sm font-medium">
                Slug (optional, auto-generated from name)
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                defaultValue={product?.slug}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <BrandField brands={brands} defaultBrandId={product?.brand_id} />
          </div>

          <SpecFieldsEditor
            categories={categories}
            templatesWithFields={templatesWithFields}
            categoryId={categoryId}
            defaultValues={defaultSpecValues}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="stock" className="text-sm font-medium">
                Stock
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                min="0"
                defaultValue={product?.stock}
                required
                onInput={syncRequiredFilled}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="sku" className="text-sm font-medium">
                SKU
              </label>
              <input
                id="sku"
                name="sku"
                type="text"
                defaultValue={product?.sku ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="keywords" className="text-sm font-medium">
              Search keywords (optional)
            </label>
            <input
              id="keywords"
              name="keywords"
              type="text"
              defaultValue={product?.keywords ?? ""}
              placeholder="e.g. wireless, bluetooth, sports, waterproof"
              className={inputClass}
            />
            <p className="text-xs text-[var(--pf-text-2)]">
              Extra terms customers might search for that aren&apos;t already in the name,
              brand, or description.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Service</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="codAvailable"
                defaultChecked={product?.cod_available ?? true}
              />
              Cash on Delivery available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="freeDelivery"
                defaultChecked={product?.free_delivery ?? false}
              />
              Free delivery
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="warrantyAvailable"
                defaultChecked={product?.warranty_available ?? false}
              />
              Warranty available
            </label>
          </div>

          <TagsField tags={tags} defaultTagIds={defaultTagIds} />

          <RichTextEditor value={description} onChange={setDescription} />

          <WhatsInBoxEditor value={whatsInBox} onChange={setWhatsInBox} />

          <GalleryUploader value={galleryUrls} onChange={setGalleryUrls} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={product?.status ?? "draft"}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={product?.is_featured ?? false}
              />
              Featured on homepage
            </label>
          </div>

          <details className="rounded-[var(--radius-sm)] border border-[var(--border)] p-4">
            <summary className="cursor-pointer text-sm font-medium">SEO (optional)</summary>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="metaTitle" className="text-sm font-medium">
                  Meta title
                </label>
                <input
                  id="metaTitle"
                  name="metaTitle"
                  type="text"
                  defaultValue={product?.meta_title ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="metaDescription" className="text-sm font-medium">
                  Meta description
                </label>
                <textarea
                  id="metaDescription"
                  name="metaDescription"
                  rows={2}
                  defaultValue={product?.meta_description ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
          </details>
        </FormSection>

        {hasAttributes && (
          <FormSection
            id="product-attributes"
            title="Product attributes"
            description="Optional. Pick the options this product comes in — each one can then be assigned to a variant row below."
          >
            <AttributesField
              attributesWithValues={attributesWithValues}
              value={attributeValueIds}
              onChange={setAttributeValueIds}
            />
          </FormSection>
        )}

        <FormSection id="variants-pricing" title="Variants &amp; pricing" last>
          <VariantsEditor
            value={variantDrafts}
            onChange={setVariantDrafts}
            variantAttributes={checkedNonColorAttributes}
            onSkuChecked={handleSkuChecked}
          />
        </FormSection>
      </div>

      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="whatsInBox" value={JSON.stringify(whatsInBox)} />
      <input
        type="hidden"
        name="galleryImageUrls"
        value={JSON.stringify(galleryUrls)}
      />
      {/* If the admin removes every row, this still submits one blank
          draft rather than an empty array -- syncProductVariants (server
          side) then gives a clear "needs a price" error instead of
          silently saving a product with zero variants. */}
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(variantDrafts.length > 0 ? variantDrafts : [BLANK_VARIANT_DRAFT])}
      />

      {state?.error && (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--pf-bad)] bg-[var(--pf-bad-bg)] px-3 py-2 text-sm text-[var(--pf-bad)]">
          {state.error}
        </p>
      )}

      {/* Sticky to the viewport while the form scrolls past it. The
          background is opaque rather than translucent so variant rows
          don't show through the bar as they pass under it. */}
      <div className="sticky bottom-0 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--color-card)] px-4 py-3 shadow-[0_-2px_8px_rgba(15,45,82,0.06)]">
        <p
          aria-live="polite"
          className={
            "text-[13px] " +
            (skuConflict ? "text-[var(--pf-bad)]" : "text-[var(--pf-text-2)]")
          }
        >
          {statusText}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-btn)] bg-[var(--pf-navy)] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
