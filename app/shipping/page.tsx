import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "TrendyMall shipping policy — delivery times, charges, Cash on Delivery, and order tracking across Sri Lanka.",
};

export default function ShippingPage() {
  return (
    <PageShell title="Shipping Policy">
      <p>
        At TrendyMall, we are committed to delivering your orders quickly and
        securely across Sri Lanka.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Delivery Time</h2>
      <ul className="list-disc pl-5">
        <li>Standard islandwide delivery: 3–5 business days</li>
        <li>
          Orders are processed within 24 hours after confirmation (excluding
          Sundays and public holidays)
        </li>
      </ul>

      <h2 className="font-heading mt-4 text-lg font-bold">Delivery Charges</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Delivery Area</th>
              <th className="py-2">Shipping Fee</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-4">
                Western Province &amp; Colombo 01–15 (including Colombo Fort)
              </td>
              <td className="py-2">Rs. 255</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Outside Colombo &amp; Western Province</td>
              <td className="py-2">Rs. 400</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="font-heading mt-4 text-lg font-bold">Cash on Delivery</h2>
      <p>
        Cash on Delivery (COD) is available for eligible orders across Sri
        Lanka.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Order Tracking</h2>
      <p>
        Once your order has been dispatched, you will receive tracking
        updates via WhatsApp, SMS, and email.
      </p>

      <h2 className="font-heading mt-4 text-lg font-bold">Delivery Coverage</h2>
      <p>We deliver to all major cities and most areas across Sri Lanka.</p>

      <p>
        If you have any questions about your order or delivery, our customer
        support team is always ready to assist you.
      </p>
    </PageShell>
  );
}
