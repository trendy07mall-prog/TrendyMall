export interface PaymentResult {
  ok: boolean;
  reference: string | null;
}

// PAYMENT GATEWAY INTEGRATION POINT
// Replace this stub with a real call to your payment provider (Stripe,
// PayHere, Sampath IPG, etc). It should return a reference/session id to
// store on orders.payment_reference. Only move an order's status past
// 'pending_payment' once the provider confirms payment — either
// synchronously here, or asynchronously via a webhook route handler you add
// under app/api/webhooks/<provider>/route.ts.
export async function initiatePayment(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept for the real integration
  order: {
    id: string;
    total: number;
  },
): Promise<PaymentResult> {
  return { ok: true, reference: null };
}
