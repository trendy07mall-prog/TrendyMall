"use client";

import { useActionState, useState } from "react";
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
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

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

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
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
        <p className="text-xs text-[var(--muted)]">
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

      <AttributesField
        attributesWithValues={attributesWithValues}
        value={attributeValueIds}
        onChange={setAttributeValueIds}
      />

      <VariantsEditor
        value={variantDrafts}
        onChange={setVariantDrafts}
        variantAttributes={checkedNonColorAttributes}
      />

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

      <details className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
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

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
