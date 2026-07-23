"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/admin/uploads";

export interface VariantDraft {
  colorName: string;
  colorHex: string;
  stock: string;
  imageUrl: string | null;
}

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function VariantsEditor({
  value,
  onChange,
}: {
  value: VariantDraft[];
  onChange: (next: VariantDraft[]) => void;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  function updateRow(index: number, patch: Partial<VariantDraft>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...value, { colorName: "", colorHex: "#000000", stock: "", imageUrl: null }]);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  async function handleImageChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadAdminImage("variants", formData);
    setUploadingIndex(null);

    if (result.url) updateRow(index, { imageUrl: result.url });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium">Color variants</label>

      {value.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 rounded-[var(--radius-md)] border border-[var(--border)] p-3 sm:grid-cols-[1fr_auto_1fr_auto_auto]"
        >
          <input
            type="text"
            placeholder="Color name"
            value={row.colorName}
            onChange={(e) => updateRow(index, { colorName: e.target.value })}
            className={inputClass}
          />

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={row.colorHex}
              onChange={(e) => updateRow(index, { colorHex: e.target.value })}
              className="h-9 w-9 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent p-0.5"
              aria-label="Color swatch"
            />
            <input
              type="text"
              value={row.colorHex}
              onChange={(e) => updateRow(index, { colorHex: e.target.value })}
              className={`${inputClass} w-24`}
            />
          </div>

          <input
            type="number"
            min="0"
            placeholder="Stock (optional)"
            value={row.stock}
            onChange={(e) => updateRow(index, { stock: e.target.value })}
            className={inputClass}
          />

          <div className="flex items-center gap-2">
            {row.imageUrl ? (
              <span className="relative block h-9 w-9 overflow-hidden rounded-[var(--radius-sm)]">
                <Image src={row.imageUrl} alt="" fill sizes="36px" className="object-cover" />
              </span>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(index, e)}
                className="w-28 text-xs"
              />
            )}
            {uploadingIndex === index && (
              <span className="text-xs text-[var(--muted)]">…</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => removeRow(index)}
            className="text-xs text-red-600 underline"
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
      >
        + Add color variant
      </button>
    </div>
  );
}
