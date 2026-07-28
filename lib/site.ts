// Single source of truth for the site's canonical production URL — used for
// metadataBase, JSON-LD, sitemap.xml, robots.txt, and per-page canonical
// tags. NEXT_PUBLIC_SITE_URL (set in Vercel) is authoritative; this
// fallback only matters if that env var is ever unset — localhost in dev,
// the real production domain in production, so a misconfigured local
// build never silently emits links to the live site.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://www.trendymall.online"
    : "http://localhost:3000");
