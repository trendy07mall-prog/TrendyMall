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
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

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
