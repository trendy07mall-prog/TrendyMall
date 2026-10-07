"use client";

import { useState } from "react";
import Image from "next/image";
import { FileInputButton } from "@/components/admin/FileInputButton";
import { compressAndUpload, type UploadPrefix } from "@/lib/images/upload-with-compression";
import { uploadHint, type ImageKind } from "@/lib/images/targets";

// Extracted from product-form/CategoryField.tsx's inline single-image
// upload block so it isn't copy-pasted per banner field (campaigns need
// three: desktop, mobile, thumbnail).
export function SingleImageUploader({
  label,
  name,
  value,
  onChange,
  hint,
  kind,
  prefix = "campaigns",
  previewShape = "banner",
  warnIfNotSquare = false,
  onBusyChange,
}: {
  label: string;
  name: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /**
   * Extra guidance specific to this field (ratio, where it appears). The
   * size/format line is NOT written here -- it is generated from the
   * target below and rendered underneath, so it cannot go stale.
   */
  hint?: string;
  /**
   * Which target this field compresses to. Drives the generated hint, the
   * browser compressor and the server's re-check, so all three agree by
   * construction.
   */
  kind: ImageKind;
  /**
   * Lets the parent form disable Save while a file is being processed, so
   * a half-finished image can never be saved. Forms that do not pass it
   * behave exactly as before.
   */
  onBusyChange?: (busy: boolean) => void;
  // Storage prefix passed straight to uploadAdminImage — defaults to
  // "campaigns" so the 3 existing CampaignForm.tsx call sites (which never
  // passed this) keep uploading to the same place as before.
  prefix?: UploadPrefix;
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
  const [busy, setBusy] = useState<"compressing" | "uploading" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Measured from the image once the browser has decoded it, so the
  // warning reflects the real file. Next's optimizer may resize the
  // image but preserves its aspect ratio, which is all that is read.
  const [aspectOff, setAspectOff] = useState(false);

  function setBusyState(next: "compressing" | "uploading" | null) {
    setBusy(next);
    onBusyChange?.(next !== null);
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusyState("compressing");
    setError(null);
    setNote(null);

    // compressAndUpload resolves with {error} for every failure, including
    // the ones that used to throw, so there is no path here that leaves
    // the field stuck busy with nothing shown.
    const outcome = await compressAndUpload(file, kind, prefix, setBusyState);

    setBusyState(null);

    // The input is cleared either way, so picking the SAME file again
    // after a rejection still fires a change event and retries it.
    event.target.value = "";

    if (outcome.error) {
      setError(outcome.error);
      return;
    }
    setNote(outcome.note ?? null);
    onChange(outcome.url ?? null);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      {/* whitespace-pre-line lets a caller break a longer hint over lines
          with "\n". No visual change for any existing single-line hint --
          none of them contain a newline. */}
      {hint && <span className="text-xs whitespace-pre-line text-[var(--muted)]">{hint}</span>}
      {/* Generated from IMAGE_TARGETS, never hand-written -- see targets.ts. */}
      <span className="text-xs text-[var(--muted)]">{uploadHint(kind)}</span>
      <FileInputButton
        label="Choose Image"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        disabled={busy !== null}
      />
      {busy && (
        <span className="text-xs text-[var(--muted)]">
          {busy === "compressing" ? "Compressing…" : "Uploading…"}
        </span>
      )}
      {note && <span className="text-xs text-[var(--muted)]">{note}</span>}
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
