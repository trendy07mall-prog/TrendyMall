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

// The store's WhatsApp number (already used, as the same literal, by
// components/layout/WhatsAppButton.tsx and components/product/
// WhatsAppOrderButton.tsx — exported here too since a checkout-failure
// contact link needed a third copy and duplicating the literal a third
// time wasn't worth it).
export const WHATSAPP_NUMBER = "94775312484";

export function getWhatsAppUrl(message?: string): string {
  return message
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${WHATSAPP_NUMBER}`;
}
