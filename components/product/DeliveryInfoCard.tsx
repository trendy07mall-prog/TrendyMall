import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE } from "@/lib/delivery-fee";
import { formatPrice } from "@/lib/utils";

// No address is known on the PDP, so this shows the same generic
// Colombo/outside-Colombo fee split app/cart/page.tsx already shows before
// an address is picked -- not a new calculation, and not
// calculateDeliveryFee/describeDeliveryFee, which both require a real
// district + postal code this page doesn't have.
export function DeliveryInfoCard({
  deliveryLabel,
  codAvailable,
}: {
  deliveryLabel: string;
  codAvailable: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-sm">
      <p className="flex items-center gap-2">
        <span aria-hidden="true">🚚</span>
        {deliveryLabel}
      </p>
      <p className="flex items-center gap-2 text-[var(--muted)]">
        <span aria-hidden="true">💳</span>
        {formatPrice(RATE_IN_ZONE)} (Colombo 1–15) · {formatPrice(RATE_OUTSIDE_ZONE)} (Outside Colombo)
      </p>
      {codAvailable && (
        <p className="flex items-center gap-2 text-[var(--muted)]">
          <span aria-hidden="true">💰</span>
          Cash on Delivery available
        </p>
      )}
    </div>
  );
}
