import { CheckBadgeIcon, LockIcon, ReturnIcon, TruckIcon } from "@/components/ui/Icon";

const FEATURES = [
  { icon: CheckBadgeIcon, title: "100% Original", description: "Genuine Products Only" },
  { icon: TruckIcon, title: "Fast Delivery", description: "Islandwide delivery in 3-5 business days" },
  { icon: LockIcon, title: "Secure Checkout", description: "Your data is encrypted" },
  { icon: ReturnIcon, title: "Easy Returns", description: "Damaged items reported within 48hrs" },
];

export function ShopTrustStrip() {
  return (
    <div className="mt-8 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:gap-[var(--grid-gap)] sm:overflow-visible sm:pb-0">
      {FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="flex w-[72%] shrink-0 snap-start items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)] sm:w-auto sm:min-h-[70px]"
        >
          <feature.icon className="h-8 w-8 shrink-0 stroke-[1.5] text-[var(--foreground)]" />
          <div>
            <p className="text-base font-semibold">{feature.title}</p>
            <p className="text-[13px] leading-tight text-[var(--color-text-secondary)]">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
