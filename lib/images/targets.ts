/**
 * THE one place image upload targets are defined.
 *
 * Every number a person sees or a file is measured against comes from this
 * file: the compressor's budgets, the rejection thresholds, and the hint
 * text under each upload field. The hints are GENERATED (see uploadHint)
 * rather than typed out next to each field, which is the whole point --
 * before this, "Recommended 1600×500" and friends were hand-written strings
 * in six different forms with nothing keeping them true. Change a number
 * here and the hint, the compressor and the validator all move together.
 *
 * Changing a target does NOT touch images already uploaded. There is no
 * bulk re-compression; these apply to the next upload only.
 */

export type ImageKind =
  | "product"
  | "heroDesktop"
  | "heroMobile"
  | "banner"
  | "category"
  | "logo"
  | "icon";

export interface ImageTarget {
  /** Shown in hints and error messages. Lowercase; it appears mid-sentence. */
  readonly label: string;
  /** Hard ceiling for the stored file. The compressor works down to this. */
  readonly maxBytes: number;
  /** Bounding box. Aspect ratio is preserved and the image is never cropped. */
  readonly maxWidth: number;
  readonly maxHeight: number;
  /**
   * Below this, the image is rejected as too small to look sharp -- and it
   * is also the floor the compressor will not shrink past when it is
   * trying to reach maxBytes. Both uses are deliberate: the smallest size
   * we would accept from a person is the smallest size we should produce.
   */
  readonly minWidth: number;
  readonly minHeight: number;
  /**
   * Whether a transparent source keeps its alpha channel. Photos are
   * flattened-free but opaque anyway; logos and icons must keep it.
   * Also decides whether the JPEG fallback (no alpha) is usable -- see
   * compress.ts.
   */
  readonly keepTransparency: boolean;
}

export const IMAGE_TARGETS: Record<ImageKind, ImageTarget> = {
  // Shop cards, galleries, variants, bundle photos, and rich-text inline
  // images. Square bound because the shop card renders 1:1 object-contain.
  product: {
    label: "product photo",
    maxBytes: 150 * 1024,
    maxWidth: 1000,
    maxHeight: 1000,
    minWidth: 600,
    minHeight: 600,
    keepTransparency: false,
  },
  // Split from a single "hero" target because since the art-directed
  // <picture> landed, a phone downloads ONLY the mobile file and a desktop
  // ONLY the desktop one. They are different pictures with different jobs.
  heroDesktop: {
    label: "desktop hero banner",
    maxBytes: 200 * 1024,
    maxWidth: 1920,
    maxHeight: 650,
    minWidth: 960,
    minHeight: 325,
    keepTransparency: false,
  },
  // The strictest budget on the site: this is the LCP image on phones,
  // which are also the slowest connections.
  heroMobile: {
    label: "mobile hero banner",
    maxBytes: 120 * 1024,
    maxWidth: 1200,
    maxHeight: 675,
    minWidth: 600,
    minHeight: 338,
    keepTransparency: false,
  },
  // Campaign banners, promo strips, thumbnails, social preview cards.
  banner: {
    label: "banner",
    maxBytes: 100 * 1024,
    maxWidth: 600,
    maxHeight: 300,
    minWidth: 300,
    minHeight: 150,
    keepTransparency: false,
  },
  // Renders at sizes="64px" -- 192px on a DPR-3 phone. 400 is generous.
  category: {
    label: "category image",
    maxBytes: 30 * 1024,
    maxWidth: 400,
    maxHeight: 400,
    minWidth: 256,
    minHeight: 256,
    keepTransparency: true,
  },
  // Brand logos and the site logo. Renders up to ~45vw on a phone, so
  // ~527px at DPR 3 -- hence a larger box than the category image.
  logo: {
    label: "logo",
    maxBytes: 30 * 1024,
    maxWidth: 600,
    maxHeight: 600,
    minWidth: 300,
    minHeight: 300,
    keepTransparency: true,
  },
  // Favicons and app icons. 180 is the apple-touch-icon floor.
  icon: {
    label: "icon",
    maxBytes: 30 * 1024,
    maxWidth: 512,
    maxHeight: 512,
    minWidth: 180,
    minHeight: 180,
    keepTransparency: true,
  },
};

/** Formats a byte count the way the hints and messages say it. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    // 2.4 MB, but 2 MB rather than 2.0 MB.
    return `${mb >= 10 || Number.isInteger(mb) ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * The hint shown under an upload field BEFORE a file is chosen. Generated
 * from the target above so it can never drift out of date.
 *
 * e.g. "Auto-compressed to under 150 KB · WebP · about 1000 × 1000 px"
 */
export function uploadHint(kind: ImageKind): string {
  const t = IMAGE_TARGETS[kind];
  return `Auto-compressed to under ${formatBytes(t.maxBytes)} · WebP · about ${t.maxWidth} × ${t.maxHeight} px`;
}

/**
 * The note shown AFTER a file has been processed.
 *
 * e.g. "product-1.jpg compressed from 2.4 MB to 138 KB (WebP, 1000 × 1000)"
 */
export function compressionNote(input: {
  name: string;
  fromBytes: number;
  toBytes: number;
  width: number;
  height: number;
  format: "webp" | "jpeg";
}): string {
  const format = input.format === "webp" ? "WebP" : "JPEG";
  return `${input.name} compressed from ${formatBytes(input.fromBytes)} to ${formatBytes(
    input.toBytes,
  )} (${format}, ${input.width} × ${input.height})`;
}

/** Hard ceiling on what may be handed to the compressor at all. */
export const MAX_INPUT_BYTES = 5 * 1024 * 1024;

/** Quality ladder, tried in order, before dimensions are touched. */
export const QUALITY_STEPS = [85, 80, 75] as const;

/** How much each dimension retry shrinks by once quality is exhausted. */
export const DIMENSION_STEP = 0.9;
