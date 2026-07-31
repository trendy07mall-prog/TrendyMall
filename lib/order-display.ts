import { formatPrice } from "@/lib/utils";
import type { OrderFulfillmentStatus, PaymentStatus } from "@/types";

// The order-confirmation page previously showed PaymentStatusBadge's
// generic label ("Payment pending") verbatim for every payment method —
// for Cash on Delivery this reads as if the customer still owes money
// before their order will proceed, which it doesn't. This derives a
// payment-method-aware badge/message instead, kept separate from
// PaymentStatusBadge (admin surfaces still want the plain, neutral
// truth of payment_status regardless of method).
export function getPaymentDisplay(input: {
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderFulfillmentStatus;
  total: number;
}): { badge: string; message: string } {
  const { paymentMethod, paymentStatus, orderStatus, total } = input;

  if (paymentStatus === "paid") {
    return { badge: "Paid", message: "Payment received." };
  }
  // Defensive: a COD order that's already delivered should never say
  // "pay in cash when it arrives" regardless of what payment_status
  // happens to say (the data-consistency fix, sql/041, means this
  // shouldn't occur going forward, but the display logic guards it too).
  if (orderStatus === "delivered" && paymentMethod === "cod") {
    return { badge: "Cash on Delivery", message: "Payment collected on delivery." };
  }
  if (paymentStatus === "failed") {
    return {
      badge: "Payment failed",
      message: "Your payment didn't go through — message us on WhatsApp and we'll help you sort it out.",
    };
  }
  if (paymentStatus === "cancelled") {
    return { badge: "Payment cancelled", message: "This payment was cancelled." };
  }
  if (paymentStatus === "refunded") {
    return { badge: "Refunded", message: "This order has been refunded." };
  }

  // Still in progress (pending / awaiting_verification) — the only
  // states where the method itself changes what the customer should do.
  if (paymentMethod === "cod") {
    return { badge: "Cash on Delivery", message: `Pay ${formatPrice(total)} in cash when your order arrives.` };
  }
  if (paymentMethod === "bank_transfer") {
    return { badge: "Awaiting Payment", message: `Please transfer ${formatPrice(total)} and send us your slip.` };
  }
  // payhere, still pending — PendingPaymentPoller keeps refreshing until
  // the webhook lands and paymentStatus becomes "paid".
  return { badge: "Processing Payment", message: "We're confirming your card payment — this page will update automatically." };
}
