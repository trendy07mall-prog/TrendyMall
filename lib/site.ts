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

// Fallback only -- the real number now lives in Settings
// (general.whatsapp_number, see lib/data/settings.ts). Server components
// that already fetch settings should pass that value as `number` below;
// this constant only matters for the few call sites that don't (yet).
export const WHATSAPP_NUMBER = "94775312484";

export function getWhatsAppUrl(message?: string, number: string = WHATSAPP_NUMBER): string {
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
}
