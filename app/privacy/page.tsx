import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TrendyMall collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy">
      <p>
        TrendyMall (&quot;we&quot;, &quot;us&quot;) respects your privacy.
        This policy explains what information we collect when you use{" "}
        trendymall.lk, why we collect it, and how it&apos;s protected.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">
        Information We Collect
      </h2>
      <p>When you create an account, place an order, or contact us, we collect:</p>
      <ul className="list-disc pl-5">
        <li>Your name, email address, and phone number</li>
        <li>Your delivery address</li>
        <li>Order history and the products you&apos;ve purchased</li>
        <li>
          Basic site-usage data (pages visited, general location) via Google
          Analytics and Meta Pixel, if enabled
        </li>
      </ul>
      <p>
        We do not collect or store payment card details — orders are
        currently fulfilled via Cash on Delivery only.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">
        How We Use Your Information
      </h2>
      <ul className="list-disc pl-5">
        <li>To process and deliver your orders</li>
        <li>To send order confirmations and delivery updates</li>
        <li>To respond to your questions and support requests</li>
        <li>
          To send occasional marketing emails, only if you&apos;ve subscribed
          to our newsletter — you can unsubscribe at any time
        </li>
        <li>To improve our website and product range</li>
      </ul>

      <h2 className="font-heading mt-4 text-lg font-bold">
        How We Store and Protect It
      </h2>
      <p>
        Your data is stored securely with Supabase, our database provider,
        which encrypts data in transit and at rest. Access to customer data
        is restricted to TrendyMall staff who need it to fulfil your order.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Sharing</h2>
      <p>
        We do not sell your personal information. We share the minimum
        necessary details (name, phone, address) with our delivery partners
        solely to deliver your order.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Your Rights</h2>
      <p>
        You can request a copy of the personal data we hold about you, ask us
        to correct it, or ask us to delete your account and associated data,
        by contacting us at{" "}
        <a href="mailto:trendy07mall@gmail.com" className="underline">
          trendy07mall@gmail.com
        </a>
        .
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Cookies</h2>
      <p>
        We use cookies and similar technologies for essential site
        functionality (like keeping items in your cart) and, where enabled,
        for analytics (Google Analytics) and advertising (Meta Pixel) to
        understand how our site is used and improve it.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">
        Changes to This Policy
      </h2>
      <p>
        We may update this policy from time to time. Continued use of the
        site after changes means you accept the updated policy.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Contact Us</h2>
      <p>
        Questions about this policy? Reach us via{" "}
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
