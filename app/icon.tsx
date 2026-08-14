import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getBrandingSettings } from "@/lib/data/settings";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const FALLBACK_PATH = "public/images/logo/trendymall-mark.png";

// The TM-mark-only crop of the logo — wordmark excluded, it's illegible at
// this size. ImageResponse/Satori can't resolve a relative /public path at
// render time, only a data URI or an absolute fetchable URL, so this reads
// the branding.favicon_url setting and resolves it to a data URI: a local
// "/images/..." path is read straight off disk (same as the original
// static behavior), an uploaded Supabase URL is fetched over the network.
// Any failure (missing row, network hiccup, bad URL) falls back to the
// original static file so the favicon can never go blank.
async function loadFaviconDataUri(): Promise<string> {
  try {
    const branding = await getBrandingSettings();
    const faviconUrl = branding.faviconUrl;

    if (!faviconUrl || faviconUrl.startsWith("/")) {
      const relativePath = faviconUrl && faviconUrl.startsWith("/") ? faviconUrl.slice(1) : FALLBACK_PATH.replace("public/", "");
      const bytes = await readFile(join(process.cwd(), "public", relativePath));
      return `data:image/png;base64,${bytes.toString("base64")}`;
    }

    const response = await fetch(faviconUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const contentTypeHeader = response.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentTypeHeader};base64,${buffer.toString("base64")}`;
  } catch {
    const bytes = await readFile(join(process.cwd(), FALLBACK_PATH));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  }
}

export default async function Icon() {
  const dataUri = await loadFaviconDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} alt="" width={30} height={14} style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size },
  );
}
