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

// `number` is required on purpose. It used to default to a hardcoded
// constant here, described as a fallback "for the few call sites that
// don't (yet)" pass the real value -- and that default is exactly how an
// admin changing the WhatsApp number in Settings silently failed to reach
// seven call sites, including the product page's "Order via WhatsApp"
// button and the delivery-failure link emailed to customers. They all kept
// quoting a number the store no longer answers, with nothing to indicate
// it, because a default can be wrong without being noticed.
//
// The real number lives in Settings (general.whatsapp_number, see
// lib/data/settings.ts). Making this required means a new call site cannot
// compile without deciding where its number comes from.
export function getWhatsAppUrl(message: string | undefined, number: string): string {
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
}
