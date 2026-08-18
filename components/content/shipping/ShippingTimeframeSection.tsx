import { TruckIcon, PackageIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

// Hand-maintained restatement of policies.shipping_body's "Delivery Time"
// list (see PolicyDetailsCard.tsx's comment on this tradeoff) -- kept in
// sync with sql/073_shipping_delivery_time_update.sql's wording: Colombo
// 1-2 working days, other areas 2-4, explicitly estimated not guaranteed.
const TIMEFRAMES = [
  { icon: TruckIcon, area: "Colombo 01–15", days: "1–2 working days" },
  { icon: PackageIcon, area: "Other areas", days: "2–4 working days" },
];

const COURIERS = ["Daraz Logistics", "Fardar", "Trans", "PickMe Flash"];

export function ShippingTimeframeSection() {
  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
          Delivery Timeframes
        </p>
        <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How long delivery takes
        </h2>
      </FadeIn>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {TIMEFRAMES.map((t, index) => (
          <FadeIn key={t.area} delay={index * 0.06}>
            <div className="flex h-full items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
              <t.icon className="h-8 w-8 shrink-0 text-[#0F2D52]" />
              <div>
                <p className="text-sm font-semibold">{t.area}</p>
                <p className="text-lg font-bold text-[#16A34A]">{t.days}</p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.12}>
        <p className="mt-4 text-center text-xs text-[var(--muted)] italic">
          These timeframes are estimated, not guaranteed — actual delivery can vary by location and
          courier availability.
        </p>
      </FadeIn>

      <FadeIn delay={0.16}>
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
            Delivered via our courier partners
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {COURIERS.map((courier) => (
              <span
                key={courier}
                className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
              >
                {courier}
              </span>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
