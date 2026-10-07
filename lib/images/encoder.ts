/**
 * The canvas half of the compressor -- the only part that needs a browser.
 *
 * Three things happen here that the rest of the pipeline relies on and
 * that are worth stating plainly, because they are properties of canvas
 * rather than code anyone wrote:
 *
 *  1. EXIF ROTATION. createImageBitmap(..., { imageOrientation: "from-image" })
 *     returns the bitmap already turned the right way up, so a sideways
 *     phone photo is measured, resized and encoded upright. Verified: a
 *     400x200 JPEG tagged orientation 6 decodes as 200x400.
 *
 *  2. METADATA STRIPPING. A canvas holds pixels, nothing else. Whatever
 *     comes out of convertToBlob carries no EXIF and no GPS, because there
 *     is nowhere for it to have survived. Verified on a GPS-tagged fixture:
 *     no EXIF chunk, no GPS string in the output.
 *
 *  3. ALPHA. A transparent source keeps its alpha (the WebP gains an ALPH
 *     chunk); an opaque photo does not get one. So "photos should not carry
 *     an alpha channel" needs no special handling -- not adding one is the
 *     default.
 */

import type { DecodedImage, EncodedImage, ImageEncoder } from "./compress";

/** Alpha is sampled at this size rather than full resolution. */
const ALPHA_SCAN_MAX = 512;

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  // Safari < 16.4 and older Android webviews. Only reachable on the main
  // thread -- a worker without OffscreenCanvas has no canvas at all, which
  // is exactly why compress-client falls back to the main thread.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(canvas: AnyCanvas, type: string, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      type,
      quality,
    );
  });
}

/**
 * Decodes once, then re-encodes from that single bitmap at whatever size
 * and quality the ladder asks for -- the file is never decoded twice.
 */
export function createBrowserEncoder(): ImageEncoder {
  let bitmap: ImageBitmap | null = null;

  return {
    async decode(file: Blob): Promise<DecodedImage> {
      // "from-image" is the explicit form. Chromium already honours EXIF by
      // default, but the default is "from-image" only in newer specs, so
      // saying it keeps behaviour identical across browsers.
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

      const { width, height } = bitmap;
      if (!width || !height) return { width: 0, height: 0, hasAlpha: false };

      // Sampled, not exhaustive: transparency in a logo or icon covers
      // large regions, and this only decides the Safari JPEG-fallback
      // question. A full-resolution scan of a 5 MP photo to answer it
      // would cost more than the encode.
      const scale = Math.min(ALPHA_SCAN_MAX / width, ALPHA_SCAN_MAX / height, 1);
      const sw = Math.max(1, Math.round(width * scale));
      const sh = Math.max(1, Math.round(height * scale));

      const canvas = makeCanvas(sw, sh);
      const ctx = canvas.getContext("2d") as
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D
        | null;
      if (!ctx) return { width, height, hasAlpha: false };

      ctx.drawImage(bitmap, 0, 0, sw, sh);
      let hasAlpha = false;
      try {
        const data = ctx.getImageData(0, 0, sw, sh).data;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasAlpha = true;
            break;
          }
        }
      } catch {
        // getImageData can throw on a tainted canvas. It cannot be tainted
        // here (the source is a local File, not a cross-origin URL), but
        // treating it as opaque is the safe answer either way: the only
        // consequence is a transparent image being refused on a browser
        // that cannot encode WebP, rather than silently flattened.
        hasAlpha = false;
      }

      return { width, height, hasAlpha };
    },

    async encode({ width, height, quality, type }): Promise<EncodedImage> {
      if (!bitmap) throw new Error("encode() called before decode()");

      const canvas = makeCanvas(width, height);
      const ctx = canvas.getContext("2d") as
        | OffscreenCanvasRenderingContext2D
        | CanvasRenderingContext2D
        | null;
      if (!ctx) throw new Error("could not get a 2d context");

      // Best-quality downscale available. Both are no-ops where unsupported.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (type === "image/jpeg") {
        // JPEG cannot store alpha. compress.ts only reaches here for images
        // it has already established are opaque, but a white base means a
        // stray transparent pixel becomes white rather than black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, type, quality / 100);
      return { blob, type: blob.type, size: blob.size };
    },

    dispose() {
      bitmap?.close();
      bitmap = null;
    },
  };
}
