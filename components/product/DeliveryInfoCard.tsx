import Link from "next/link";
import { TruckIcon, CashIcon, ReturnIcon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";
import { RATE_IN_ZONE, RATE_OUTSIDE_ZONE, type DeliveryZone } from "@/lib/delivery-fee";

// No address is known on the PDP, so the rates shown here are the whole
// rate card, not a real per-order calculation -- calculateDeliveryFee and
// describeDeliveryFee both need a district + postal code this page does
// not have. The 48-hour return window is the one fixed policy fact on
// this card (same wording as the Returns page); everything else is
// per-product/per-settings, never invented.
//
// This used to take two numbers and print "Colombo 1–15 / Outside
// Colombo", which stopped being the whole story the moment a third zone
// existed: a Wellampitiya customer read Rs 400 here and was charged
// Rs 255 at checkout. It now renders every active zone from the table, in
// the admin's own sort order and under the admin's own zone names, so
// adding a zone updates this line with no code change.
export function DeliveryInfoCard({
  deliveryLabel,
  codAvailable,
  zones,
}: {
  deliveryLabel: string;
  codAvailable: boolean;
  zones: DeliveryZone[];
}) {
  // The catch-all is named last and phrased as the fallback it is; every
  // other active zone is listed by name ahead of it.
  const namedZones = zones.filter((zone) => !zone.isDefault);
  const defaultZone = zones.find((zone) => zone.isDefault);
  // An empty/misconfigured zones table must not blank out the rate line --
  // same constants, and same reasoning, as every other fallback here.
  const rateParts =
    namedZones.length > 0
      ? namedZones.map((zone) => `${formatPrice(zone.rate)} (${zone.name})`)
      : [`${formatPrice(RATE_IN_ZONE)} (Colombo 1–15)`];
  const outsideRate = defaultZone?.rate ?? RATE_OUTSIDE_ZONE;
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
            {rateParts.join(" · ")} · {formatPrice(outsideRate)} (Outside Colombo)
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
