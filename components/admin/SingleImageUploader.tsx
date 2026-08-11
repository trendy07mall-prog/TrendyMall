"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/admin/uploads";

// Extracted from product-form/CategoryField.tsx's inline single-image
// upload block so it isn't copy-pasted per banner field (campaigns need
// three: desktop, mobile, thumbnail).
export function SingleImageUploader({
  label,
  name,
  value,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAdminImage("campaigns", formData);

    setUploading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange(result.url ?? null);
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      {hint && <span className="text-xs text-[var(--muted)]">{hint}</span>}
      <input type="file" accept="image/*" onChange={handleChange} className="text-sm" />
      {uploading && <span className="text-xs text-[var(--muted)]">Uploading…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {value && (
        <span className="relative mt-1 block h-20 w-full max-w-xs overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
          <Image src={value} alt="" fill sizes="320px" className="object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
          >
            Remove
          </button>
        </span>
      )}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
