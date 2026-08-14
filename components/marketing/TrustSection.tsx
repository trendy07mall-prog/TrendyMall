import { CheckBadgeIcon, HeadsetIcon, LockIcon, ReturnIcon } from "@/components/ui/Icon";

// Return-policy wording ("48hrs") stays hardcoded until Phase 4 (Policies)
// — this component only wires the business-hours claim in Phase 1.
export function TrustSection({
  businessHoursSummary = "Daily 10am–4pm",
}: {
  // Settings-backed (general.business_hours via
  // formatBusinessHoursSummary), defaulting to today's live text.
  businessHoursSummary?: string;
}) {
  const claims = [
    {
      icon: ReturnIcon,
      title: "Easy Returns",
      description: "Damaged Items Reported Within 48hrs",
    },
    {
      icon: LockIcon,
      title: "Secure Checkout",
      // Deliberately not "Payment Protected" — no online payment processing
      // is live yet (PayHere is feature-flagged and sandboxed). This claim
      // only asserts what's actually true: the site runs on HTTPS.
      description: "Your data is encrypted",
    },
    {
      icon: HeadsetIcon,
      title: "Fast Support",
      description: businessHoursSummary,
    },
    {
      icon: CheckBadgeIcon,
      title: "Quality Guarantee",
      description: "Genuine Products Only",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-12">
      <div className="grid grid-cols-2 gap-[var(--grid-gap)] sm:grid-cols-4">
        {claims.map((claim) => (
          <div
            key={claim.title}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] text-center shadow-[var(--shadow-card)]"
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
