"use client";

import { useState } from "react";
import Image from "next/image";
import { uploadAdminImage } from "@/lib/admin/uploads";
import { FileInputButton } from "@/components/admin/FileInputButton";

// Extracted from product-form/CategoryField.tsx's inline single-image
// upload block so it isn't copy-pasted per banner field (campaigns need
// three: desktop, mobile, thumbnail).
export function SingleImageUploader({
  label,
  name,
  value,
  onChange,
  hint,
  prefix = "campaigns",
  previewShape = "banner",
  warnIfNotSquare = false,
}: {
  label: string;
  name: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
  // Storage prefix passed straight to uploadAdminImage — defaults to
  // "campaigns" so the 3 existing CampaignForm.tsx call sites (which never
  // passed this) keep uploading to the same place as before.
  prefix?: "categories" | "brands" | "products" | "variants" | "editor" | "campaigns" | "settings" | "hero";
  // "banner" is the original preview -- a short, wide, cropped strip,
  // right for a campaign banner or a hero slide. "square" previews the
  // image the way a shop card actually shows it: 1:1, object-contain on
  // white, nothing cropped. Defaults to "banner", so the five existing
  // callers render exactly as they did before.
  previewShape?: "banner" | "square";
  // Warns -- but still allows -- when the image is far from 1:1. Only
  // meaningful alongside previewShape="square".
  warnIfNotSquare?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Measured from the image once the browser has decoded it, so the
  // warning reflects the real file. Next's optimizer may resize the
  // image but preserves its aspect ratio, which is all that is read.
  const [aspectOff, setAspectOff] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    // A request that fails before uploadAdminImage's own code runs (e.g.
    // exceeding the platform's request body limit) throws rather than
    // returning {error} -- without this catch, `uploading` would stay
    // true forever with no message shown.
    let result;
    try {
      result = await uploadAdminImage(prefix, formData);
    } catch {
      setUploading(false);
      setError("Upload failed — please try a smaller file or try again.");
      return;
    }

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
      {/* whitespace-pre-line lets a caller break a longer hint over lines
          with "\n". No visual change for any existing single-line hint --
          none of them contain a newline. */}
      {hint && <span className="text-xs whitespace-pre-line text-[var(--muted)]">{hint}</span>}
      <FileInputButton label="Choose Image" accept="image/*" onChange={handleChange} />
      {uploading && <span className="text-xs text-[var(--muted)]">Uploading…</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {value && (
        <span
          className={
            previewShape === "square"
              ? // Deliberately the SAME box the shop card uses --
                // aspect-square, object-contain, white behind -- so what
                // is previewed here is what a customer will see, right
                // down to the letterboxing on a non-square photo.
                "relative mt-1 block aspect-square w-40 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-white"
              : "relative mt-1 block h-20 w-full max-w-xs overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]"
          }
        >
          <Image
            src={value}
            alt=""
            fill
            sizes={previewShape === "square" ? "160px" : "320px"}
            className={previewShape === "square" ? "object-contain" : "object-cover"}
            onLoad={(event) => {
              if (!warnIfNotSquare) return;
              const img = event.currentTarget;
              if (!img.naturalWidth || !img.naturalHeight) return;
              const ratio = img.naturalWidth / img.naturalHeight;
              // Generous on purpose: a 1000x1080 photo is fine, a
              // 1920x1080 banner is not.
              setAspectOff(ratio < 0.9 || ratio > 1.1);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white"
          >
            Remove
          </button>
        </span>
      )}
      {value && warnIfNotSquare && aspectOff && (
        // A warning, not a block: an odd-shaped photo is still better
        // than no photo, and the owner may have a good reason.
        <span className="mt-1 text-xs text-[var(--color-warning)]">
          This image isn&apos;t square — edges may look empty or cut off.
        </span>
      )}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
