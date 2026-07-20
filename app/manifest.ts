import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrendyMall — Mobile Phone Accessories",
    short_name: "TrendyMall",
    description:
      "Premium mobile phone accessories in Sri Lanka — earbuds, speakers, power banks, and headphones.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
