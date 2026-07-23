"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import type { Category, Product, ProductImage, ProductVariant } from "@/types";
import type { ProductFormState } from "@/lib/admin/products";
import { CategoryField } from "./product-form/CategoryField";
import { TagInput } from "./product-form/TagInput";
import { PricingFields } from "./product-form/PricingFields";
import { VariantsEditor, type VariantDraft } from "./product-form/VariantsEditor";
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
  product,
  images,
  variants,
  action,
}: {
  categories: Category[];
  product?: Product;
  images?: ProductImage[];
  variants?: ProductVariant[];
  action: (
    state: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const [description, setDescription] = useState(product?.description ?? "");
  const [compatibleDevices, setCompatibleDevices] = useState<string[]>(
    product?.compatible_devices ?? [],
  );
  const [whatsInBox, setWhatsInBox] = useState<string[]>(
    product?.whats_in_box ?? [],
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    (images ?? []).map((i) => i.image_url),
  );
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>(
    (variants ?? []).map((v) => ({
      colorName: v.color_name,
      colorHex: v.color_hex,
      stock: v.stock?.toString() ?? "",
      imageUrl: v.variant_image_url,
    })),
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <CategoryField categories={categories} defaultCategoryId={product?.category_id} />

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
        <div className="flex flex-col gap-1">
          <label htmlFor="brand" className="text-sm font-medium">
            Brand
          </label>
          <input
            id="brand"
            name="brand"
            type="text"
            defaultValue={product?.brand ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="model" className="text-sm font-medium">
            Model
          </label>
          <input
            id="model"
            name="model"
            type="text"
            defaultValue={product?.model ?? ""}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input type="checkbox" name="bluetooth" defaultChecked={product?.bluetooth ?? false} />
          Bluetooth
        </label>
      </div>

      <TagInput
        label="Compatible devices"
        placeholder="Type a device and press Enter"
        value={compatibleDevices}
        onChange={setCompatibleDevices}
      />

      <PricingFields
        defaultActualPrice={product?.actual_price}
        defaultSpecialPrice={product?.special_price}
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

      <VariantsEditor value={variantDrafts} onChange={setVariantDrafts} />

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
      <input
        type="hidden"
        name="compatibleDevices"
        value={JSON.stringify(compatibleDevices)}
      />
      <input type="hidden" name="whatsInBox" value={JSON.stringify(whatsInBox)} />
      <input
        type="hidden"
        name="galleryImageUrls"
        value={JSON.stringify(galleryUrls)}
      />
      <input type="hidden" name="variants" value={JSON.stringify(variantDrafts)} />

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
