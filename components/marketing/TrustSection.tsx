import { CheckBadgeIcon, HeadsetIcon, LockIcon, ReturnIcon } from "@/components/ui/Icon";

const CLAIMS = [
  {
    icon: ReturnIcon,
    title: "Easy Returns",
    description: "Damaged Items Reported Within 48hrs",
  },
  {
    icon: LockIcon,
    title: "Secure Checkout",
    description: "Safe & Protected",
  },
  {
    icon: HeadsetIcon,
    title: "Fast Support",
    description: "Daily 10am–4pm",
  },
  {
    icon: CheckBadgeIcon,
    title: "Quality Guarantee",
    description: "Genuine Products Only",
  },
];

export function TrustSection() {
  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <div className="grid grid-cols-2 gap-[var(--grid-gap)] sm:grid-cols-4">
        {CLAIMS.map((claim) => (
          <div
            key={claim.title}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-card)] p-[var(--card-padding)] text-center shadow-[var(--shadow-card)]"
          >
            <claim.icon className="h-7 w-7 shrink-0 stroke-[1.5] text-[var(--foreground)]" />
            <h3 className="text-sm font-semibold">{claim.title}</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {claim.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
