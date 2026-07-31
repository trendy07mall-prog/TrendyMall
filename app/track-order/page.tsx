import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/order/TrackOrderForm";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Check your TrendyMall order using your order number and the phone or email you used.",
  alternates: { canonical: "/track-order" },
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  // Prefills the order number when linked from /order-confirmation's
  // "Track Order" button — never the contact field, which stays a real
  // second factor the customer must type themselves rather than
  // something a shareable link could leak.
  const { orderNumber } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Track Your Order
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Enter your order number and the phone or email you used at checkout.
      </p>
      <div className="mt-8">
        <TrackOrderForm defaultOrderNumber={orderNumber} />
      </div>
    </div>
  );
}
