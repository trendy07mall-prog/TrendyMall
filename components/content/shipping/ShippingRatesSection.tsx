import { PackageIcon, TruckIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";
import { formatPrice } from "@/lib/utils";
import type { DeliveryZone } from "@/lib/delivery-fee";

// Rates render directly from the live delivery_zones table (via
// getActiveDeliveryZones(), the same function app/shipping/page.tsx
// already called before this redesign) -- a real .map() over whatever
// zones actually exist today, not a hardcoded two-row table. If an admin
// adds/renames/re-prices a zone in Store Settings, this section updates
// with zero code change.
export function ShippingRatesSection({ zones }: { zones: DeliveryZone[] }) {
  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
            Delivery Rates
          </p>
          <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            What delivery costs
          </h2>
        </FadeIn>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {zones.map((zone, index) => {
            // Purely for icon choice, not for the rate itself -- every
            // rate number always comes straight from `zone.rate`.
            const isFastZone = zone.districtMatch === "Colombo";
            return (
              <FadeIn key={zone.id} delay={index * 0.06}>
                <div className="flex h-full flex-col items-center gap-2 rounded-[18px] border border-[var(--border)] bg-white p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                  {isFastZone ? (
                    <TruckIcon className="h-9 w-9 shrink-0 text-[#0F2D52]" />
                  ) : (
                    <PackageIcon className="h-9 w-9 shrink-0 text-[#0F2D52]" />
                  )}
                  <h3 className="text-sm font-semibold">{zone.name}</h3>
                  <p className="text-2xl font-bold text-[#16A34A]">{formatPrice(zone.rate)}</p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
