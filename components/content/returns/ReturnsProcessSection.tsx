import { HeadsetIcon, ChecklistIcon, SwapIcon, WhatsAppIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";
import { getWhatsAppUrl } from "@/lib/site";

const STEPS = [
  {
    icon: HeadsetIcon,
    title: "Contact Support",
    description: "Reach us via WhatsApp within 48 hours of receiving your order.",
  },
  {
    icon: ChecklistIcon,
    title: "Inspection",
    description: "We review the issue and confirm the item qualifies for return.",
  },
  {
    icon: SwapIcon,
    title: "Replacement or Refund",
    description: "A replacement (subject to stock), or a full refund if unavailable.",
  },
];

// Same "Return Conditions" list as policies.returns_body -- original
// packaging, all accessories/documentation, no misuse/damage after
// delivery. Keep in sync if the policy text is ever edited.
const CONDITIONS = [
  "In its original packaging",
  "Includes all accessories and documentation",
  "Shows no signs of misuse or physical damage caused after delivery",
];

export function ReturnsProcessSection({ whatsappNumber, general }: { whatsappNumber: string; general: { email: string } }) {
  const whatsappUrl = getWhatsAppUrl(
    "Hi, I'd like to request a return for my order — here are the details:",
    whatsappNumber,
  );

  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
          Return Process
        </p>
        <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How a return works
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

      <FadeIn delay={0.16}>
        <div className="mx-auto mt-10 max-w-xl rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-[var(--card-padding)]">
          <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
            Returned items must be:
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {CONDITIONS.map((condition) => (
              <li key={condition} className="flex items-start gap-2.5 text-sm">
                <ChecklistIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                {condition}
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-brand flex min-h-11 items-center gap-2 rounded-[var(--radius-btn)] bg-[#16A34A] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[#15803d]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Start a Return on WhatsApp
          </a>
          <p className="text-xs text-[var(--muted)]">
            Or email{" "}
            <a href={`mailto:${general.email}`} className="underline">
              {general.email}
            </a>
          </p>
        </div>
      </FadeIn>
    </section>
  );
}
