import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";

export const metadata: Metadata = {
  title: "About TrendyMall",
  description:
    "TrendyMall is Sri Lanka's trusted destination for premium mobile phone accessories.",
};

export default function AboutPage() {
  return (
    <PageShell title="About TrendyMall">
      <p>
        At TrendyMall, we&apos;re passionate about helping people get the
        best out of their mobile devices with high-quality accessories at
        affordable prices. We carefully select products that combine
        durability, performance, and modern design, ensuring our customers
        receive reliable accessories they can trust every day.
      </p>
      <p>
        Founded with a commitment to quality, value, and excellent customer
        service, TrendyMall has grown into a trusted destination for mobile
        phone accessories in Sri Lanka. From chargers, cables, earphones,
        power banks, and phone cases to a wide range of other mobile
        accessories, we strive to provide a seamless shopping experience
        backed by competitive prices, fast islandwide delivery, and
        dedicated customer support.
      </p>
      <p>
        Our mission is simple: to make premium mobile accessories accessible
        to everyone while delivering an exceptional shopping experience from
        order to delivery.
      </p>
    </PageShell>
  );
}
