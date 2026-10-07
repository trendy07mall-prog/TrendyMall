/**
 * What a file actually IS, read from its first bytes.
 *
 * A file's extension and its browser-reported `type` are both just claims:
 * renaming photo.heic to photo.jpg makes `File.type` say "image/jpeg" in
 * most browsers, and the upload would then fail somewhere much less
 * helpful -- at the decoder, or at the storage bucket's own MIME check.
 * Reading the container signature is the only way to say what it is.
 *
 * Shared by the browser (before compressing) and the server (which must
 * never trust what the browser sent).
 */

export type DetectedFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "heic"
  | "avif"
  | "bmp"
  | "tiff"
  | "svg"
  | "unknown";

/** The only formats this app accepts as an upload. */
export const ACCEPTED_FORMATS = ["jpeg", "png", "webp"] as const;
export type AcceptedFormat = (typeof ACCEPTED_FORMATS)[number];

export function isAccepted(format: DetectedFormat): format is AcceptedFormat {
  return (ACCEPTED_FORMATS as readonly string[]).includes(format);
}

const ascii = (bytes: Uint8Array, start: number, length: number): string => {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
};

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  bytes.length >= signature.length && signature.every((b, i) => bytes[i] === b);

// ISO base-media brands that mean "HEIC/HEIF photo". iPhones write heic
// and mif1 most often; the rest are listed so a message stays specific
// rather than falling through to "unknown".
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/**
 * Reads the container signature. Needs only the first ~16 bytes, so
 * callers can slice a large file rather than reading all of it.
 */
export function detectFormat(bytes: Uint8Array): DetectedFormat {
  if (bytes.length < 4) return "unknown";

  // JPEG: SOI marker, then any marker byte.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";

  // PNG: the 8-byte signature, including the CRLF/EOF trap bytes.
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";

  // RIFF container -- WEBP is at offset 8, after the 4-byte length.
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";

  // GIF87a / GIF89a.
  if (ascii(bytes, 0, 4) === "GIF8") return "gif";

  // ISO base media (HEIC, AVIF): a box-size word, then "ftyp", then brand.
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (HEIC_BRANDS.has(brand)) return "heic";
    if (brand === "avif" || brand === "avis") return "avif";
  }

  if (ascii(bytes, 0, 2) === "BM") return "bmp";

  // TIFF, little- and big-endian. Also what some cameras hand out as .tif.
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])) {
    return "tiff";
  }

  // SVG is text, so there is no signature to match -- this sniff exists
  // ONLY so an SVG gets a message naming it instead of "unrecognised".
  // SVG is not an accepted upload format; nothing downstream handles it.
  const head = ascii(bytes, 0, Math.min(bytes.length, 300)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg";

  return "unknown";
}

/** Human name for a detected format, for use inside a message. */
export function formatName(format: DetectedFormat): string {
  switch (format) {
    case "jpeg":
      return "JPG";
    case "png":
      return "PNG";
    case "webp":
      return "WebP";
    case "gif":
      return "GIF";
    case "heic":
      return "HEIC";
    case "avif":
      return "AVIF";
    case "bmp":
      return "BMP";
    case "tiff":
      return "TIFF";
    case "svg":
      return "SVG";
    default:
      return "an unrecognised file type";
  }
}

/**
 * The message shown when a file is not an accepted format. Each one names
 * the file, what was actually found, what is allowed, and what to do about
 * it -- a bare "wrong format" leaves someone with a photo they cannot
 * upload and no idea why.
 */
export function rejectionMessageForFormat(fileName: string, format: DetectedFormat): string {
  const allowed = "Allowed: JPG, PNG or WebP.";

  switch (format) {
    case "heic":
      return (
        `${fileName} is a HEIC photo, which isn't supported. ${allowed} ` +
        `In your phone's camera settings choose "Most Compatible" so new photos save as JPG, ` +
        `or export this one as JPG and upload that.`
      );
    case "gif":
      return (
        `${fileName} is a GIF, which isn't supported (animation would be lost anyway). ` +
        `${allowed} Save the frame you want as a JPG or PNG and upload that.`
      );
    case "svg":
      return (
        `${fileName} is an SVG, which isn't supported. ${allowed} ` +
        `Export it as a PNG at the size shown in the hint — keep the transparent background if it has one.`
      );
    case "avif":
    case "bmp":
    case "tiff":
      return (
        `${fileName} is ${formatName(format)}, which isn't supported. ${allowed} ` +
        `Open it in any photo app and export it as JPG or PNG.`
      );
    default:
      return (
        `${fileName} isn't a readable image — its contents don't match any image format. ` +
        `${allowed} If you renamed a file to .jpg, rename won't convert it; ` +
        `open the original and export it as JPG or PNG.`
      );
  }
}

/** Convenience for the server, which holds a whole Buffer already. */
export function detectFormatFromBuffer(buffer: ArrayBufferLike | Uint8Array): DetectedFormat {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return detectFormat(bytes.subarray(0, 300));
}
