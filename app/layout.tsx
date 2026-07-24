import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { RecentlyViewedProvider } from "@/context/RecentlyViewedContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { PromoBanner } from "@/components/marketing/PromoBanner";
import { getActiveBanner } from "@/lib/data/banner";
import { JsonLd } from "@/components/seo/JsonLd";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Premium Mobile Phone Accessories | TrendyMall Sri Lanka",
    template: "%s | TrendyMall",
  },
  description:
    "Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available.",
  openGraph: {
    type: "website",
    siteName: "TrendyMall",
    title: "Premium Mobile Phone Accessories | TrendyMall Sri Lanka",
    description:
      "Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Mobile Phone Accessories | TrendyMall Sri Lanka",
    description:
      "Shop premium mobile phone accessories in Sri Lanka. Fast islandwide delivery and Cash on Delivery available.",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TrendyMall",
  url: siteUrl,
  logo: `${siteUrl}/icon`,
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
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationSchema} />
        <GoogleAnalytics />
        <MetaPixel />
        <CartProvider>
          <WishlistProvider>
            <RecentlyViewedProvider>
              <PromoBanner banner={banner} />
              <Navbar />
              <main className="flex flex-1 flex-col">{children}</main>
              <Footer />
              <WhatsAppButton />
            </RecentlyViewedProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
