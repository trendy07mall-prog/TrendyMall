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
import { getActiveBanner } from "@/lib/data/banner";
import { JsonLd } from "@/components/seo/JsonLd";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
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

const inter = localFont({
  src: [
    { path: "./fonts/inter-400.woff2", weight: "400" },
    { path: "./fonts/inter-500.woff2", weight: "500" },
    { path: "./fonts/inter-600.woff2", weight: "600" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Premium Mobile Phone Accessories | TrendyMall Sri Lanka",
    template: "%s | TrendyMall",
  },
  description:
    "Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available.",
  // Deliberately no `alternates.canonical` here: Next.js metadata cascades
  // to every child page that doesn't set its own, and a root-level "/"
  // canonical would wrongly tell Google every page on the site is a
  // duplicate of the homepage. Each indexable page sets its own instead
  // (see app/page.tsx, app/shop/page.tsx, etc.) — pages that don't set one
  // simply emit no canonical tag, which is safe (the current, pre-existing
  // default), not wrong.
  // No manual `images` here for either openGraph or twitter — the
  // opengraph-image.tsx file convention (app/opengraph-image.tsx) already
  // auto-generates and injects og:image/twitter:image tags for any route
  // that doesn't define its own; adding one manually risks a duplicate tag
  // rather than a missing one.
  openGraph: {
    type: "website",
    siteName: "TrendyMall",
    title: "Premium Mobile Phone Accessories | TrendyMall Sri Lanka",
    description:
      "Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Mobile Phone Accessories | TrendyMall Sri Lanka",
    description:
      "Shop premium mobile phone accessories in Sri Lanka. Fast islandwide delivery and Cash on Delivery available.",
    images: ["/opengraph-image"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TrendyMall",
  url: SITE_URL,
  logo: `${SITE_URL}/icon`,
  sameAs: [
    "https://www.facebook.com/share/18oKpTZ1fg/?mibextid=wwXIfr",
    "https://www.instagram.com/trendy_.mall_._?igsh=MTE4M2IyM3lpeWs1YQ%3D%3D&utm_source=qr",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+94750187145",
    contactType: "customer service",
    email: "trendy07mall@gmail.com",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const banner = await getActiveBanner();

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
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
        <GoogleAnalytics />
        <MetaPixel />
        <ToastProvider>
          <CartProvider>
            <WishlistProvider>
              <RecentlyViewedProvider>
                <ConditionalChrome>
                  <AnnouncementBar />
                  <PromoBanner banner={banner} />
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
                  <TrustSection />
                  <Footer />
                  <WhatsAppButton />
                  <MobileBottomNav />
                </ConditionalChrome>
              </RecentlyViewedProvider>
            </WishlistProvider>
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
