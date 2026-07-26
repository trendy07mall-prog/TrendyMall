import { CheckBadgeIcon, LockIcon, PriceTagIcon, TruckIcon } from "@/components/ui/Icon";

const FEATURES = [
  { icon: CheckBadgeIcon, title: "100% Original", description: "Genuine Products" },
  { icon: PriceTagIcon, title: "Best Prices", description: "Affordable Deals" },
  { icon: LockIcon, title: "Secure Checkout", description: "Safe & Secure" },
  { icon: TruckIcon, title: "Fast Delivery", description: "Island-wide Delivery" },
];

export function ShopTrustStrip() {
  return (
    <div className="mt-8 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:gap-[var(--grid-gap)] sm:overflow-visible sm:pb-0">
      {FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="flex w-[72%] shrink-0 snap-start items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] shadow-[var(--shadow-card)] sm:w-auto"
        >
          <feature.icon className="h-6 w-6 shrink-0 stroke-[1.5] text-[var(--foreground)]" />
          <div>
            <p className="text-sm font-semibold">{feature.title}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
