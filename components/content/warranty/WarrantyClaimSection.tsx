import { WhatsAppIcon, HeadsetIcon, ChecklistIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";
import { getWhatsAppUrl } from "@/lib/site";

const STEPS = [
  {
    icon: WhatsAppIcon,
    title: "Message us on WhatsApp",
    description: "Include your order number and a description of the issue.",
  },
  {
    icon: ChecklistIcon,
    title: "We review the issue",
    description: "We'll confirm whether the product carries a warranty and what it covers.",
  },
  {
    icon: HeadsetIcon,
    title: "We follow up with next steps",
    description: "Repair, replacement, or another resolution, depending on the product.",
  },
];

export function WarrantyClaimSection({ whatsappNumber }: { whatsappNumber: string }) {
  const whatsappUrl = getWhatsAppUrl("Hi, I'd like to make a warranty claim for my order — here are the details:", whatsappNumber);

  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
          Claiming a Warranty
        </p>
        <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How to make a claim
        </h2>
      </FadeIn>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <FadeIn key={step.title} delay={index * 0.08}>
            <div className="flex h-full flex-col items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F2D52] text-sm font-bold text-white">
                {index + 1}
              </span>
              <step.icon className="mt-1 h-7 w-7 shrink-0 text-[#0F2D52]" />
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-xs text-[var(--muted)]">{step.description}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.2}>
        <div className="mt-8 flex justify-center">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-brand flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-[#16A34A] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#15803d]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Start a Warranty Claim
          </a>
        </div>
      </FadeIn>
    </section>
  );
}
