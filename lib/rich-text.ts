// Admin-authored rich text (product descriptions, policy pages) is stored
// as sanitized HTML and rendered with dangerouslySetInnerHTML, so the
// images inside it are plain <img> tags -- not next/image. That means they
// bypass the optimizer entirely and decode at whatever resolution was
// uploaded, which is the one genuinely unbounded thing in the storefront's
// memory profile: a 223KB JPEG in this bucket is 2385x2560, which is
// 23.3MB of decoded bitmap for one picture, and a product description can
// hold several.
//
// This rewrites those <img> tags on the way out, so an image that is
// already stored oversized is still served and decoded small. It covers
// every existing file without touching storage, and keeps covering
// anything that gets past the upload-time cap in lib/admin/uploads.ts
// later -- the two are belt and braces, not alternatives.
//
// Why a targeted regex rather than re-parsing with sanitize-html: this
// content has already been sanitized on write (lib/admin/products.ts) with
// allowedAttributes { img: ["src", "alt"] }, so every <img> here is a
// simple, self-closing tag with at most those two double-quoted
// attributes. Re-serializing the whole document through a parser on every
// render would cost more and risks quietly altering admin-authored markup
// that is currently stored byte-for-byte. Nothing here trusts the input:
// a tag that does not match is passed through untouched.

// Only these widths are offered. 828 is the ceiling on purpose -- a phone
// at DPR 3 would happily take 1080+ for a full-width image, and the
// decoded cost scales with the square of that. 828 is a configured
// deviceSize (next.config.ts), so it adds no new transformation variants,
// and it caps a square image at roughly 2.7MB decoded instead of the
// 7-23MB these originals currently cost.
const WIDTHS = [384, 640, 828] as const;
const QUALITY = 75; // must be listed in next.config.ts `qualities`

// The description column is max-w-[820px] with p-6 padding, so it never
// displays wider than ~772px however large the viewport gets.
const SIZES = "(max-width: 820px) calc(100vw - 48px), 772px";

const IMG_TAG_RE = /<img\b[^>]*>/gi;
const SRC_RE = /\bsrc\s*=\s*"([^"]*)"/i;
const ALT_RE = /\balt\s*=\s*"([^"]*)"/i;
const HAS_LOADING_RE = /\bloading\s*=/i;
const HAS_DECODING_RE = /\bdecoding\s*=/i;

// Supabase public object URLs are the only thing next.config.ts's
// remotePatterns allows through the optimizer, so rewriting anything else
// would produce a 400 instead of an image.
const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/";

function storageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

function isOptimizable(src: string, host: string | null): boolean {
  if (!host) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === host && url.pathname.startsWith(PUBLIC_OBJECT_PREFIX);
  } catch {
    // Relative or malformed src -- left alone rather than guessed at.
    return false;
  }
}

function optimizerUrl(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${QUALITY}`;
}

// Adds lazy/async decoding to a tag this function is not rewriting (a
// relative path, a third-party host, an <img> with no src at all). Those
// still must not decode before they are scrolled to; they just cannot be
// resized on the way through.
function addLoadingHints(tag: string): string {
  let out = tag;
  if (!HAS_LOADING_RE.test(out)) out = out.replace(/^<img\b/i, '<img loading="lazy"');
  if (!HAS_DECODING_RE.test(out)) out = out.replace(/^<img\b/i, '<img decoding="async"');
  return out;
}

/**
 * Rewrites <img> tags in stored rich text so they are served through the
 * Next.js image optimizer at a capped width, lazily, and decoded
 * asynchronously. Input is returned unchanged when there is nothing to do.
 */
export function optimizeRichTextImages(html: string | null | undefined): string {
  if (!html) return "";
  if (!html.includes("<img")) return html;

  const host = storageHost();

  return html.replace(IMG_TAG_RE, (tag) => {
    const srcMatch = tag.match(SRC_RE);
    const src = srcMatch?.[1];
    if (!src || !isOptimizable(src, host)) return addLoadingHints(tag);

    // alt is taken verbatim: it comes out of sanitize-html already entity
    // -escaped, so re-escaping it here would double-encode &amp; and friends.
    const alt = tag.match(ALT_RE)?.[1] ?? "";
    const srcset = WIDTHS.map((w) => `${optimizerUrl(src, w)} ${w}w`).join(", ");

    return (
      `<img src="${optimizerUrl(src, WIDTHS[WIDTHS.length - 1])}" srcset="${srcset}" ` +
      `sizes="${SIZES}" alt="${alt}" loading="lazy" decoding="async">`
    );
  });
}
