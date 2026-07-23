"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/admin/uploads";
import type { Category } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const NEW_CATEGORY_VALUE = "__new__";

export function CategoryField({
  categories,
  defaultCategoryId,
}: {
  categories: Category[];
  defaultCategoryId?: string;
}) {
  const [selected, setSelected] = useState(defaultCategoryId ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNewCategory = selected === NEW_CATEGORY_VALUE;

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAdminImage("categories", formData);

    setUploading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setImageUrl(result.url ?? null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="categoryId" className="text-sm font-medium">
          Category
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setImageUrl(null);
            setError(null);
          }}
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
          <option value={NEW_CATEGORY_VALUE}>+ Add new category</option>
        </select>
      </div>

      {isNewCategory && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="newCategoryName" className="text-sm font-medium">
              New category name
            </label>
            <input
              id="newCategoryName"
              name="newCategoryName"
              type="text"
              required
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="newCategoryImage" className="text-sm font-medium">
              Category image (required)
            </label>
            <input
              id="newCategoryImage"
              type="file"
              accept="image/*"
              required={!imageUrl}
              onChange={handleImageChange}
              className="text-sm"
            />
            {uploading && (
              <span className="text-xs text-[var(--muted)]">Uploading…</span>
            )}
            {error && <span className="text-xs text-red-600">{error}</span>}
            {imageUrl && (
              <span className="relative mt-1 block h-16 w-16 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
                <Image src={imageUrl} alt="" fill sizes="64px" className="object-cover" />
              </span>
            )}
          </div>
          <input type="hidden" name="newCategoryImageUrl" value={imageUrl ?? ""} />
        </div>
      )}
    </div>
  );
}
