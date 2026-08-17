import { CashIcon, BankIcon, CreditCardIcon, TruckIcon, HeadsetIcon, ReturnIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

// cardAvailable must be computed the exact same way checkout gates the
// Card option (isPayHereEnabled() && paymentSettings.onlinePaymentEnabled)
// -- passed in from the page rather than re-deriving it here, so this
// component can never drift out of sync with checkout's own logic.
export function AboutExperience({
  codEnabled,
  bankTransferEnabled,
  cardAvailable,
}: {
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  cardAvailable: boolean;
}) {
  const cards = [
    {
      icon: CashIcon,
      title: "Cash on Delivery",
      description: codEnabled ? "Pay in cash when your order arrives." : "Currently unavailable.",
      comingSoon: !codEnabled,
    },
    {
      icon: BankIcon,
      title: "Bank Transfer",
      description: bankTransferEnabled ? "Transfer to our account, then upload your slip." : "Currently unavailable.",
      comingSoon: !bankTransferEnabled,
    },
    {
      icon: CreditCardIcon,
      title: "Card Payment",
      description: "Visa, Mastercard, and American Express — via PayHere.",
      comingSoon: !cardAvailable,
    },
    {
      icon: TruckIcon,
      title: "Islandwide Delivery",
      description: "We deliver across Sri Lanka.",
      comingSoon: false,
    },
    {
      icon: HeadsetIcon,
      title: "Customer Support",
      description: "Reach us on WhatsApp, phone, or email.",
      comingSoon: false,
    },
    {
      icon: ReturnIcon,
      title: "Returns",
      description: "Damaged or wrong item? Reported within 48 hours.",
      comingSoon: false,
    },
  ];

  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
            Customer Experience
          </p>
          <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            What to expect when you shop with us
          </h2>
        </FadeIn>

        <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-3">
          {cards.map((card, index) => (
            <FadeIn key={card.title} delay={index * 0.05}>
              <div className="flex h-full flex-col items-center gap-3 rounded-[18px] border border-[var(--border)] bg-white p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <card.icon className="h-9 w-9 shrink-0 text-[var(--foreground)]" />
                <span className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{card.title}</h3>
                  {card.comingSoon && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
                      Coming Soon
                    </span>
                  )}
                </span>
                <p className="text-xs text-[var(--muted)]">{card.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
