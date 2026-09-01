"use client";

import { useActionState, useEffect, useState } from "react";
import { uploadAdminImage } from "@/lib/admin/uploads";
import { FileInputButton } from "@/components/admin/FileInputButton";
import type { BrandFormState } from "@/lib/admin/brands";
import type { Brand } from "@/types";
import Image from "next/image";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function BrandForm({
  brand,
  action,
  onSaved,
}: {
  brand: Brand | null;
  action: (state: BrandFormState, formData: FormData) => Promise<BrandFormState>;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => {
    if (state && "success" in state) onSaved?.();
  }, [state, onSaved]);
  const [imageUrl, setImageUrl] = useState<string | null>(brand?.image_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAdminImage("brands", formData);

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
          defaultValue={brand?.name ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug (optional — auto-generated from the name if blank)
        </label>
        <input id="slug" name="slug" type="text" defaultValue={brand?.slug ?? ""} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={brand?.description ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="image" className="text-sm font-medium">
          Logo (optional)
        </label>
        <FileInputButton id="image" label="Choose Image" accept="image/*" onChange={handleImageChange} />
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
        <input type="checkbox" name="isActive" defaultChecked={brand?.is_active ?? true} />
        Active
      </label>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || uploading}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Brand"}
      </button>
    </form>
  );
}
