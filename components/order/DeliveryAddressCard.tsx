import type { DeliveryMethod, GuestOrderAddressDetail } from "@/types";

// Covers every address-rendering variant this app has needed so far
// (pickup fallback text, a structured address detail object, or just the
// order's raw flattened address string) — shared by /order-confirmation,
// /track-order, and /account/orders/[id] so none of them hand-roll their
// own copy of this formatting.
export function DeliveryAddressCard({
  deliveryMethod,
  addressDetail,
  shippingAddress,
}: {
  deliveryMethod: DeliveryMethod;
  addressDetail: GuestOrderAddressDetail | null;
  shippingAddress: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-sm">
      <h2 className="text-sm font-semibold">{deliveryMethod === "pickup" ? "Pickup" : "Delivery address"}</h2>
      <p className="mt-2 text-[var(--muted)]">
        {deliveryMethod === "pickup"
          ? `Store Pickup — ${shippingAddress}`
          : addressDetail
            ? `${addressDetail.street}, ${addressDetail.city}, ${addressDetail.district}${
                addressDetail.postalCode ? ` ${addressDetail.postalCode}` : ""
              }`
            : shippingAddress}
      </p>
    </div>
  );
}
