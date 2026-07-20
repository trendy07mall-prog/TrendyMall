"use client";

import { useActionState } from "react";
import Image from "next/image";
import type { Category, Product } from "@/types";
import type { ProductFormState } from "@/lib/admin/products";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function ProductForm({
  categories,
  product,
  action,
}: {
  categories: Category[];
  product?: Product;
  action: (
    state: ProductFormState,
    formData: FormData,
  ) => Promise<ProductFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="mt-8 flex flex-col gap-4"
    >
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

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="price" className="text-sm font-medium">
            Price (LKR)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price}
            required
            className={inputClass}
          />
        </div>
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
          <label htmlFor="categoryId" className="text-sm font-medium">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.category_id ?? ""}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Select…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={product?.is_active ?? true}
        />
        Active (visible in storefront)
      </label>

      {product && product.images.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Existing images</span>
          <div className="flex flex-wrap gap-3">
            {product.images.map((src) => (
              <label key={src} className="flex flex-col items-center gap-1 text-xs">
                <span className="relative block h-16 w-16 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <span className="flex items-center gap-1">
                  <input type="checkbox" name="keepImage" value={src} defaultChecked />
                  Keep
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="images" className="text-sm font-medium">
          Upload new images
        </label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          className="text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="imageUrls" className="text-sm font-medium">
          Or paste image URLs (one per line)
        </label>
        <textarea id="imageUrls" name="imageUrls" rows={2} className={inputClass} />
      </div>

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
