import { headers } from "next/headers";
import Script from "next/script";

// No-op until NEXT_PUBLIC_META_PIXEL_ID is set (see SETUP.md). Only
// initializes the pixel -- PageView firing (including the very first one)
// lives entirely in PageViewTracker now, so every page load is tracked the
// same way regardless of whether it's the initial document load or a
// client-side route change, with no double-fire on load.
//
// Deliberately split in two, rather than deferring Meta's stock one-liner
// wholesale. That snippet does two very different jobs: it defines the
// window.fbq stub (a few lines, no network) and it injects
// fbevents.js (~106KB, which then pulls a much larger per-pixel payload --
// together ~541KB, about a third of this page's JavaScript, and none of it
// needed to render anything).
//
// Only the second job is deferred to lazyOnload. The stub has to stay
// early, because lib/analytics/track.ts skips the pixel call outright when
// window.fbq isn't defined yet -- it doesn't buffer -- and PageViewTracker
// fires on mount. Deferring the stub too would therefore drop the initial
// PageView for essentially every visitor, not just fast bounces. With the
// stub in place, calls made before fbevents.js arrives land in fbq's own
// queue (n.queue) and replay once it loads, so nothing is lost while the
// heavy download still moves off the critical path.
//
// THE HOST ALLOW-LIST
// -------------------
// Every Vercel deployment answers on its own hostname as well as the real
// domain -- trendy-mall-nine.vercel.app, plus a unique URL per preview
// build. They all run this same code with the same
// NEXT_PUBLIC_META_PIXEL_ID, so every preview visit and every internal
// click-through was reporting into the live pixel alongside real customer
// traffic.
//
// A literal list rather than NEXT_PUBLIC_SITE_URL on purpose. Which hosts
// may report to the live pixel is a decision, not configuration, and
// reading it from an env var means the answer depends on a value that is
// set per-deployment and cannot be checked by reading this file. Both
// spellings of the real domain are listed because the apex 308-redirects
// to www and either can be the host that actually serves a request.
//
// Anything not on this list gets no pixel at all: preview deployments,
// *.vercel.app, and localhost. The last one is deliberate too --
// development traffic was reaching the live pixel the same way preview
// traffic was.
const PIXEL_ALLOWED_HOSTS = ["www.trendymall.online", "trendymall.online"];

export async function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  // Lowercased and stripped of any :port before comparing, so a host that
  // differs only in case or carries a port is judged on the name alone.
  const requestHost = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  if (!PIXEL_ALLOWED_HOSTS.includes(requestHost)) return null;

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[]}(window, document,'script');
        fbq('init', '${pixelId}');
      `}
      </Script>
      <Script
        id="meta-pixel-lib"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="lazyOnload"
      />
    </>
  );
}
