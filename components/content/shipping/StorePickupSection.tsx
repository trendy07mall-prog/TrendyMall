import { StoreIcon, MapPinIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";
import type { ShippingSettings } from "@/lib/data/settings";

// Every field here reads live from getShippingSettings() -- nothing
// hardcoded, so an admin toggling pickup off (or editing the address/
// hours) is reflected immediately with no code change.
export function StorePickupSection({ shipping }: { shipping: ShippingSettings }) {
  if (!shipping.pickupEnabled) return null;

  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-8 text-center">
            <StoreIcon className="h-9 w-9 shrink-0 text-[#0F2D52]" />
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#16A34A] uppercase">Store Pickup</p>
              <h2 className="font-heading mt-1 text-xl font-bold">{shipping.pickupName}</h2>
            </div>
            <div className="flex items-start gap-2 text-sm text-[var(--foreground)]">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span>{shipping.pickupAddress}</span>
            </div>
            <p className="text-sm text-[var(--muted)]">{shipping.pickupHours}</p>
            {shipping.pickupInstructions && (
              <p className="text-xs text-[var(--muted)]">{shipping.pickupInstructions}</p>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
