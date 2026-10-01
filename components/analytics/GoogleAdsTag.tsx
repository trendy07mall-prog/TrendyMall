import Script from "next/script";
import { headers } from "next/headers";

// Google Ads (gtag.js). Entirely inert until both env vars are set, so
// this ships to production doing nothing at all until the IDs exist.
//
// MetaPixel.tsx is deliberately untouched by this work -- no shared
// module was extracted from it, which is why the host list below is a
// second copy rather than an import. It must stay identical to the one
// there: if you change one, change both.
//
// Anything not on this list gets no tag: preview deployments,
// *.vercel.app, and localhost. That last one matters -- it is how
// development traffic stops reaching a live ads account.
const ADS_ALLOWED_HOSTS = ["www.trendymall.online", "trendymall.online"];

export async function GoogleAdsTag() {
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  // No ID, no tag, no network request. Nothing is loaded.
  if (!adsId) return null;

  // Lowercased and stripped of any :port, so a host that differs only in
  // case or carries a port is judged on the name alone.
  const requestHost = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  if (!ADS_ALLOWED_HOSTS.includes(requestHost)) return null;

  return (
    <>
      <Script
        id="google-ads-lib"
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        // afterInteractive, matching the Meta pixel: this is measurement,
        // not page content, and it must not compete with first paint.
        strategy="afterInteractive"
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${adsId}');
        `}
      </Script>
    </>
  );
}
