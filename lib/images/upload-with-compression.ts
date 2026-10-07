/**
 * compress-then-upload, in one call, for every admin image picker.
 *
 * Each picker used to build its own FormData and call uploadAdminImage
 * directly. They all now go through here instead, so the compression step,
 * the "kind" the server validates against, and the never-upload-the-
 * original rule are in one place rather than six.
 *
 * The compressor is pulled in with a dynamic import so it is not in the
 * admin's initial JavaScript -- it only loads once somebody actually picks
 * a file. (It cannot reach a public page either way: nothing outside
 * components/admin imports any of this.)
 */

"use client";

import { uploadAdminImage } from "@/lib/admin/uploads";
import type { ImageKind } from "./targets";

export type UploadPrefix =
  | "categories"
  | "brands"
  | "products"
  | "variants"
  | "editor"
  | "campaigns"
  | "settings"
  | "hero";

export interface UploadOutcome {
  url?: string;
  /** Ready to show. Always names the file and what to do about it. */
  error?: string;
  /** e.g. "photo.jpg compressed from 2.4 MB to 138 KB (WebP, 1000 × 1000)" */
  note?: string;
}

export async function compressAndUpload(
  file: File,
  kind: ImageKind,
  prefix: UploadPrefix,
  /** Lets the caller show "Compressing…" then "Uploading…" for one file. */
  onPhase?: (phase: "compressing" | "uploading") => void,
): Promise<UploadOutcome> {
  const { compressForUpload } = await import("./compress-client");

  onPhase?.("compressing");
  const compressed = await compressForUpload(file, kind);
  if (!compressed.ok) {
    // Rejected before anything left the browser. The original is never
    // sent as a fallback -- that is the whole point.
    return { error: compressed.message };
  }
  onPhase?.("uploading");

  const formData = new FormData();
  formData.set("file", compressed.file);
  // Lets the server re-check this upload against the same target the
  // browser used, instead of only the generic type/size rules.
  formData.set("kind", kind);

  try {
    const result = await uploadAdminImage(prefix, formData);
    if (result.error) return { error: `${file.name}: ${result.error}` };
    return { url: result.url, note: compressed.note };
  } catch {
    // A failure before the action's own code runs (request body limit, a
    // dropped connection). Without this the caller's "uploading" flag
    // would stay set with nothing shown.
    return { error: `${file.name} could not be uploaded — check your connection and try again.` };
  }
}

/**
 * Several files at once. Every rejection is kept with its own reason; the
 * valid files still upload. One bad file in a multi-select must not throw
 * away the good ones beside it.
 */
export async function compressAndUploadMany(
  files: File[],
  kind: ImageKind,
  prefix: UploadPrefix,
): Promise<{ urls: string[]; notes: string[]; errors: string[] }> {
  const urls: string[] = [];
  const notes: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const outcome = await compressAndUpload(file, kind, prefix);
    if (outcome.error) errors.push(outcome.error);
    if (outcome.url) urls.push(outcome.url);
    if (outcome.note) notes.push(outcome.note);
  }

  return { urls, notes, errors };
}
