import type { Metadata } from "next";
import { ViewTransition } from "react";
import localFont from "next/font/local";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { RecentlyViewedProvider } from "@/context/RecentlyViewedContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { ConditionalChrome } from "@/components/layout/ConditionalChrome";
import { PromoBanner } from "@/components/marketing/PromoBanner";
import { TrustSection } from "@/components/marketing/TrustSection";
import { HomeSearchBar } from "@/components/layout/HomeSearchBar";
import { ScrollStateProvider } from "@/context/ScrollStateContext";
import {
  getCachedGeneralSettings,
  getCachedActiveBanner,
  getCachedAnnouncementSettings,
  getCachedContactSettings,
  getCachedSocialSettings,
  getCachedActiveDeliveryZones,
  getCachedSeoSettings,
} from "@/lib/data/cached";
import { formatBusinessHoursSummary } from "@/lib/campaign-datetime";
import { JsonLd } from "@/components/seo/JsonLd";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { GoogleAdsTag } from "@/components/analytics/GoogleAdsTag";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { StorefrontOnly } from "@/components/analytics/StorefrontOnly";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Self-hosted (not next/font/google) -- avoids a build/dev-time dependency
// on fetching from fonts.gstatic.com. Files are the same Inter/Manrope
// static woff2s Google serves, just vendored locally (via @fontsource,
// latin subset only, only the weights actually used below).
const manrope = localFont({
  src: [
    { path: "./fonts/manrope-700.woff2", weight: "700" },
    { path: "./fonts/manrope-800.woff2", weight: "800" },
  ],
  variable: "--font-manrope",
  display: "swap",
});

// Only the Combo Deals surfaces use this -- the homepage strip and
// /combo-deals. Registered here because next/font has to run at the
// module top level, but nothing else opts into the variable, so every
// other page's typography is untouched. Vendored the same way as the
// two above rather than via next/font/google, for the same reason: no
// build-time fetch from fonts.gstatic.com.
// 500 and 600 WERE dropped, and are back on purpose. They were removed when
// walking every laid-out text node on the homepage and /combo-deals -- the
// only two surfaces carrying .combo-fonts at the time -- found zero elements
// computing to Jakarta at either weight, so the browser was downloading
// 24 KB for nothing. Checkout now carries .checkout-fonts and uses both
// (600 in 17 places, 500 in 2), so that reasoning no longer holds and the
// weights would otherwise be synthesised into faux bold. The 24 KB is paid
// on checkout alone: Jakarta is not preloaded, and next/font only fetches a
// weight a page actually renders.
const jakarta = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-400.woff2", weight: "400" },
    { path: "./fonts/plus-jakarta-sans-500.woff2", weight: "500" },
    { path: "./fonts/plus-jakarta-sans-600.woff2", weight: "600" },
    { path: "./fonts/plus-jakarta-sans-700.woff2", weight: "700" },
    { path: "./fonts/plus-jakarta-sans-800.woff2", weight: "800" },
  ],
  variable: "--font-jakarta",
  display: "swap",
  // The one font here that is NOT needed to paint the first screen. The
  // Combo Deals strip sits well below the fold, yet next/font preloads by
  // default, so all five weights used to be fetched at preload priority in
  // <head> -- ahead of the LCP hero image. Dropping the preload keeps the
  // bytes (the strip still gets its typeface, and display:swap means no
  // invisible text) while taking them out of the critical path. Manrope,
  // Inter and Poppins all paint above the fold, so they keep preloading.
  preload: false,
});

const inter = localFont({
  src: [
    { path: "./fonts/inter-400.woff2", weight: "400" },
    { path: "./fonts/inter-500.woff2", weight: "500" },
    { path: "./fonts/inter-600.woff2", weight: "600" },
  ],
  variable: "--font-inter",
  display: "swap",
});

// Settings-driven (Phase 4) -- generateMetadata (not a static `metadata`
// export) since it needs to await getSeoSettings(). Only the site-wide
// fallback layer: every per-page generateMetadata (product, category,
// campaign, order-confirmation) already sets its own complete title/
// description/openGraph/twitter/robots and takes priority over this
// automatically via Next's metadata merging -- this must never be wired
// into those.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedSeoSettings();

  // Deliberately no `alternates.canonical` here: Next.js metadata cascades
  // to every child page that doesn't set its own, and a root-level "/"
  // canonical would wrongly tell Google every page on the site is a
  // duplicate of the homepage. Each indexable page sets its own instead
  // (see app/page.tsx, app/shop/page.tsx, etc.) — pages that don't set one
  // simply emit no canonical tag, which is safe (the current, pre-existing
  // default), not wrong.
  // No manual `openGraph.images` when no custom image is set — the
  // opengraph-image.tsx file convention (app/opengraph-image.tsx) already
  // auto-generates and injects og:image for any route that doesn't define
  // its own; adding one manually risks a duplicate tag rather than a
  // missing one. `seo.ogImageUrl`, when set, overrides both.
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.siteTitleDefault,
      template: seo.titleTemplate,
    },
    description: seo.metaDescription,
    openGraph: {
      type: "website",
      siteName: "TrendyMall",
      title: seo.siteTitleDefault,
      description: seo.metaDescription,
      url: "/",
      ...(seo.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.siteTitleDefault,
      description: seo.metaDescription,
      images: [seo.ogImageUrl || "/opengraph-image"],
    },
  };
}

// The origin every product image is served from. Derived from the public
// env var rather than hard-coded, so a project change needs no edit here.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
})();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ALL SIX are cached now, not just general settings. These run on every
  // single request -- every storefront page and every admin page, which
  // inherits this layout while using almost none of it -- and five of them
  // were live queries, so each page load paid a database round trip for the
  // announcement bar, promo banner, contact details, delivery zones and
  // social links before anything rendered.
  //
  // They are near-static store configuration that only an admin edit
  // changes, and every mutation that can change them now calls
  // updateTag(CACHE_TAGS.settings) (lib/admin/settings.ts, banner.ts,
  // delivery-zones.ts), so an edit still shows up on the very next request.
  // That wiring is what makes caching these safe: those actions previously
  // only called revalidatePath, which invalidates rendered routes but not
  // unstable_cache entries.
  const [banner, announcement, contact, general, zones, social] = await Promise.all([
    getCachedActiveBanner(),
    getCachedAnnouncementSettings(),
    getCachedContactSettings(),
    getCachedGeneralSettings(),
    getCachedActiveDeliveryZones(),
    getCachedSocialSettings(),
  ]);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: general.storeName,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    sameAs: [social.facebookUrl, social.instagramUrl, social.tiktokUrl, social.youtubeUrl, social.twitterUrl].filter(
      Boolean,
    ),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: general.phone,
      contactType: "customer service",
      email: general.email,
    },
  };

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <head>
        {/* The Meta pixel stays exactly where it is -- afterInteractive,
            async, after hydration -- because its own script is the single
            largest blocking item on the page (measured: a 5.6 s task on
            the homepage under mobile throttling), and moving it earlier
            would put that straight into the critical path.
            
            These two hints cost no main-thread time at all: they let the
            browser finish DNS and the TLS handshake with Facebook while
            it is still busy elsewhere, so when the pixel script finally
            runs, its request goes out on an already-open connection and
            PageView fires sooner. Timing improves; blocking does not. */}
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="" />
        <link rel="preconnect" href="https://www.facebook.com" crossOrigin="" />
        {/* Supabase is where every product image is served from, so the
            connection is needed for the LCP image on every page. */}
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />}
      </head>
      <body
        className="min-h-full flex flex-col"
        // Trailing space AFTER Footer, not before it -- padding on <main>
        // shifts total document height, but so does the scroll position
        // that counts as "the bottom," so the two cancel out and a footer
        // element's position relative to the viewport at max-scroll is
        // unaffected by anything before Footer in the flow (confirmed by
        // measurement). Only padding AFTER Footer actually pushes it clear
        // of the WhatsApp FAB's path once the FAB lifts for the PDP's
        // floating purchase bar. Defaults to 0px whenever that bar isn't
        // visible.
        style={{ paddingBottom: "var(--pdp-floating-bar-height, 0px)" }}
      >
        <JsonLd data={organizationSchema} />
        <StorefrontOnly>
          <GoogleAnalytics />
          <MetaPixel />
          <GoogleAdsTag />
          <PageViewTracker />
        </StorefrontOnly>
        <ToastProvider>
          <CartProvider>
            <WishlistProvider>
              <RecentlyViewedProvider>
                <ScrollStateProvider>
                  <ConditionalChrome>
                    <AnnouncementBar
                      enabled={announcement.enabled}
                      messages={announcement.messages}
                      autoRotate={announcement.autoRotate}
                      rotateSpeedMs={announcement.rotateSpeedMs}
                      whatsappNumber={general.whatsappNumber}
                      zones={zones}
                    />
                    <PromoBanner banner={banner} />
                    {/* Non-sticky marker for "has the page scrolled past the
                        header's natural (pre-stuck) position" -- see
                        ScrollStateContext.tsx. Lives here (not inside
                        NavbarClient) so it's a plain DOM lookup any
                        consumer can share, rather than a ref private to one
                        component. */}
                    <div id="header-sticky-sentinel" aria-hidden="true" className="h-0" />
                    <Navbar />
                    <HomeSearchBar />
                  </ConditionalChrome>
                  <main
                    className="flex flex-1 flex-col"
                    style={{
                      paddingBottom:
                        "calc(var(--mobile-nav-height, 0px) + var(--pdp-floating-bar-height, 0px))",
                    }}
                  >
                    <ViewTransition>{children}</ViewTransition>
                  </main>
                  <ConditionalChrome>
                    <TrustSection businessHoursSummary={formatBusinessHoursSummary(general.businessHours)} />
                    <Footer />
                    <WhatsAppButton
                      enabled={contact.whatsappEnabled}
                      number={general.whatsappNumber}
                      defaultMessage={contact.whatsappDefaultMessage}
                    />
                    <MobileBottomNav />
                  </ConditionalChrome>
                </ScrollStateProvider>
              </RecentlyViewedProvider>
            </WishlistProvider>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
