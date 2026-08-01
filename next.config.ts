import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
  images: {
    // HeroSlider requests quality={78}; Next 16 rejects any quality not
    // explicitly listed here (75 is the implicit default used everywhere
    // else via next/image's defaults).
    qualities: [75, 78],
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
