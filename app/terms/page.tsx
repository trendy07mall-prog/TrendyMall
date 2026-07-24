import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions for shopping with TrendyMall.",
};

export default function TermsPage() {
  return (
    <PageShell title="Terms & Conditions">
      <p>
        These terms govern your use of trendymall.lk and any purchase you
        make with us. By placing an order, you agree to these terms.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Products & Pricing</h2>
      <p>
        We make every effort to display accurate product information,
        images, and pricing (in LKR). Prices and stock availability are
        subject to change without notice. If we discover a pricing error
        after your order is placed, we&apos;ll contact you before proceeding.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Orders & Payment</h2>
      <p>
        Orders are currently fulfilled via Cash on Delivery (COD) only — no
        online payment is collected. Placing an order is an offer to
        purchase, which we may accept, decline, or cancel (for example, if a
        product is out of stock).
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">
        Delivery & Shipping
      </h2>
      <p>
        See our{" "}
        <a href="/shipping" className="underline">
          Shipping Policy
        </a>{" "}
        for delivery times and charges. Delivery estimates are not
        guaranteed and may vary due to courier delays or circumstances
        outside our control.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">
        Returns & Refunds
      </h2>
      <p>
        See our{" "}
        <a href="/returns" className="underline">
          Returns &amp; Refunds Policy
        </a>{" "}
        for details on damaged, defective, or incorrect items.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Account Use</h2>
      <p>
        You&apos;re responsible for keeping your account credentials
        confidential and for all activity under your account. Please provide
        accurate contact and delivery information — we&apos;re not
        responsible for delivery issues caused by incorrect details.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">
        Limitation of Liability
      </h2>
      <p>
        TrendyMall is not liable for indirect or incidental damages arising
        from the use of our products or website, to the extent permitted by
        Sri Lankan law.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Changes</h2>
      <p>
        We may update these terms from time to time. Continued use of the
        site after changes means you accept the updated terms.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Contact</h2>
      <p>
        Questions about these terms? Reach us via{" "}
        <a href="https://wa.me/94775312484" className="underline">
          WhatsApp
        </a>{" "}
        or{" "}
        <a href="mailto:trendy07mall@gmail.com" className="underline">
          trendy07mall@gmail.com
        </a>
        .
      </p>
    </PageShell>
  );
}
