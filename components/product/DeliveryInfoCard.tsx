import Link from "next/link";
import { TruckIcon, CashIcon, ReturnIcon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

// No address is known on the PDP, so the delivery date/rates shown here are
// the same generic Colombo/outside-Colombo split app/cart/page.tsx already
// shows before an address is picked -- not a new calculation, and not
// calculateDeliveryFee/describeDeliveryFee, which both require a real
// district + postal code this page doesn't have. Rates come from the
// caller (Settings-driven delivery_zones), not a hardcoded constant. The
// 48-hour return window is the one fixed policy fact on this card (same
// wording as the Returns page) -- everything else here is per-product/
// per-settings, never invented.
export function DeliveryInfoCard({
  deliveryLabel,
  codAvailable,
  inZoneRate,
  outsideZoneRate,
}: {
  deliveryLabel: string;
  codAvailable: boolean;
  inZoneRate: number;
  outsideZoneRate: number;
}) {
  return (
    <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">At a Glance</p>
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <div className="flex items-start gap-3">
          <TruckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
          <span>{deliveryLabel}</span>
        </div>
        <div className="flex items-start gap-3">
          <CashIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
          <span>
            {formatPrice(inZoneRate)} (Colombo 1–15) · {formatPrice(outsideZoneRate)} (Outside Colombo)
            {codAvailable ? " · Cash on Delivery available" : ""}
          </span>
        </div>
        <div className="flex items-start gap-3">
          <ReturnIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
          <span>
            48-hour return window — report damaged, defective, or incorrect items within 48 hours
            of delivery.{" "}
            <Link href="/returns" className="underline underline-offset-2 hover:text-[var(--foreground)]">
              Learn more
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
