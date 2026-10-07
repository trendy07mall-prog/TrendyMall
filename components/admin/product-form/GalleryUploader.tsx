"use client";

import { useState } from "react";
import Image from "next/image";
import { FileInputButton } from "@/components/admin/FileInputButton";
import { compressAndUploadMany } from "@/lib/images/upload-with-compression";
import { uploadHint } from "@/lib/images/targets";

export function GalleryUploader({
  value,
  onChange,
  onBusyChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** Lets ProductForm keep Save disabled until every file is done. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  // One entry per rejected file. This used to be a single string that each
  // loop iteration overwrote, so picking five files and having three fail
  // showed only the last reason -- and said nothing about which file it
  // belonged to.
  const [errors, setErrors] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);

  async function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    onBusyChange?.(true);
    setErrors([]);
    setNotes([]);

    // Valid files still go through; a bad one beside them is reported
    // rather than taking the batch down with it.
    const { urls, notes: newNotes, errors: newErrors } = await compressAndUploadMany(
      files,
      "product",
      "products",
    );

    setUploading(false);
    onBusyChange?.(false);
    setErrors(newErrors);
    setNotes(newNotes);
    if (urls.length > 0) onChange([...value, ...urls]);
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

      <span className="text-xs text-[var(--muted)]">{uploadHint("product")}</span>
      <FileInputButton
        label="Add Images"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesChange}
        disabled={uploading}
      />
      {uploading && <span className="text-xs text-[var(--muted)]">Compressing and uploading…</span>}
      {notes.map((note) => (
        <span key={note} className="text-xs text-[var(--muted)]">
          {note}
        </span>
      ))}
      {/* Every rejected file, each with its own reason -- not just the last. */}
      {errors.map((message) => (
        <span key={message} className="text-xs text-red-600">
          {message}
        </span>
      ))}
    </div>
  );
}
