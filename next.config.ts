import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    // Default is 1MB, well under the 5MB image uploads this app allows
    // (lib/admin/uploads.ts, lib/uploadPaymentSlip.ts) -- without this, a
    // file between 1-5MB never reaches that code's own size check at all;
    // it's rejected at the platform layer first, as an unhandled request
    // failure rather than the friendly "File must be under 5MB." message.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // HeroSlider requests quality={88}; Next 16 rejects any quality not
    // explicitly listed here (75 is the implicit default used everywhere
    // else via next/image's defaults).
    qualities: [75, 88],
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
