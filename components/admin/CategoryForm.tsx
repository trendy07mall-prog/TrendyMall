"use client";

import { useActionState, useEffect, useState } from "react";
import { uploadAdminImage } from "@/lib/admin/uploads";
import type { CategoryFormState } from "@/lib/admin/categories";
import type { Category, SpecTemplate } from "@/types";
import Image from "next/image";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function CategoryForm({
  category,
  parentOptions,
  defaultParentId,
  specTemplateOptions,
  action,
  onSaved,
}: {
  category: Category | null;
  // Already excludes the category itself and its own descendants when
  // editing -- a category can't become its own parent (also re-checked
  // server-side, this is just so the dropdown doesn't offer an option
  // that would always be rejected).
  parentOptions: Category[];
  defaultParentId?: string | null;
  specTemplateOptions: SpecTemplate[];
  action: (state: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => {
    if (state && "success" in state) onSaved?.();
  }, [state, onSaved]);
  const [imageUrl, setImageUrl] = useState<string | null>(category?.image_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAdminImage("categories", formData);

    setUploading(false);
    if (result.error) {
      setUploadError(result.error);
      return;
    }
    setImageUrl(result.url ?? null);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={category?.name ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug (optional — auto-generated from the name if blank)
        </label>
        <input id="slug" name="slug" type="text" defaultValue={category?.slug ?? ""} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="parentId" className="text-sm font-medium">
          Parent category
        </label>
        <select
          id="parentId"
          name="parentId"
          defaultValue={defaultParentId ?? category?.parent_id ?? ""}
          className={inputClass}
        >
          <option value="">— Top level —</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {"—".repeat(option.depth)} {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="specTemplateId" className="text-sm font-medium">
          Spec template
        </label>
        <select
          id="specTemplateId"
          name="specTemplateId"
          defaultValue={category?.spec_template_id ?? ""}
          className={inputClass}
        >
          <option value="">— None —</option>
          {specTemplateOptions.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={category?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="image" className="text-sm font-medium">
          Image
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="text-sm"
        />
        {uploading && <span className="text-xs text-[var(--muted)]">Uploading…</span>}
        {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
        {imageUrl && (
          <span className="relative mt-1 block h-16 w-16 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
            <Image src={imageUrl} alt="" fill sizes="64px" className="object-cover" />
          </span>
        )}
        <input type="hidden" name="imagePath" value={imageUrl ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={category?.is_active ?? true} />
        Active
      </label>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || uploading}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Category"}
      </button>
    </form>
  );
}
