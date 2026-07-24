import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/order/TrackOrderForm";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Check the status of your TrendyMall order using your order number and phone number.",
};

export default function TrackOrderPage() {
  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 py-12">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Track Your Order
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Enter your order number and the phone number you used at checkout.
      </p>
      <div className="mt-8">
        <TrackOrderForm />
      </div>
    </div>
  );
}
