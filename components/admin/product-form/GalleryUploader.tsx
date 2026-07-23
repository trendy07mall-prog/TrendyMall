"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/admin/uploads";

export function GalleryUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    const uploaded: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadAdminImage("products", formData);
      if (result.error) {
        setError(result.error);
        continue;
      }
      if (result.url) uploaded.push(result.url);
    }

    setUploading(false);
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    event.target.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium">Product gallery</label>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {value.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] p-2"
            >
              <span className="relative block h-20 w-20 overflow-hidden rounded-[var(--radius-sm)]">
                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
              </span>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  aria-label="Move image earlier"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="px-1 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move image later"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  className="px-1 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => remove(index)}
                  className="px-1 text-red-600"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesChange}
        className="text-sm"
      />
      {uploading && <span className="text-xs text-[var(--muted)]">Uploading…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
