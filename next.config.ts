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
    // TEMPORARY (added 2026-08-14): Vercel's Image Transformations quota for
    // Aug 2026 was exceeded (5,074/5,000 on the Hobby plan), which was
    // breaking every next/image render in production. This disables
    // on-the-fly optimization entirely (images serve as their original
    // files -- no resizing/format conversion, so no quota cost) until the
    // quota resets. Revert on/after 2026-09-06 by deleting this line --
    // see SETUP.md's "Known temporary workarounds" section.
    unoptimized: true,
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
