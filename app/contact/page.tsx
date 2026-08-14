import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone, Mail, MapPin, Clock, ArrowRight } from "lucide-react";
import { getBusinessHoursStatusForWeek, formatBusinessHoursSummary } from "@/lib/campaign-datetime";
import { getGeneralSettings } from "@/lib/data/settings";
import { getWhatsAppUrl } from "@/lib/site";
import { ContactForm } from "@/components/content/ContactForm";

export const metadata: Metadata = {
  title: "Contact TrendyMall",
  description:
    "Get in touch with TrendyMall via WhatsApp, phone, or email. Salawatta Road, Wellampitiya, Sri Lanka.",
  alternates: { canonical: "/contact" },
};

// Text-search queries against `general.address` ("Salawatta Road,
// Wellampitiya, Sri Lanka") were resolving to Sedawatta -- a different,
// phonetically similar Colombo-area suburb -- rather than our actual
// location. Coordinates instead of free text remove that ambiguity
// entirely. Confirmed against https://www.google.com/maps/place/Salawatta+Rd/@6.9355634,79.8914375
const MAP_COORDINATES = "6.9355634,79.8963084";

function InfoCard({
  href,
  icon: Icon,
  label,
  children,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </>
  );

  const className =
    "min-h-11 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] shadow-[var(--shadow-card)]";

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className={`${className} block transition-colors hover:border-[var(--border-hover)]`}
      >
        {content}
      </a>
    );
  }
  return <div className={className}>{content}</div>;
}

export default async function ContactPage() {
  const general = await getGeneralSettings();

  const { isOpen, label: hoursStatusLabel } = getBusinessHoursStatusForWeek(general.businessHours);

  const whatsappHref = getWhatsAppUrl(undefined, general.whatsappNumber);
  const whatsappDisplay = general.whatsappNumber
    .replace(/^94/, "0")
    .replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  const phoneHref = `tel:${general.phone}`;
  const phoneDisplay = general.phone.replace(/^\+94/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  const emailHref = `mailto:${general.email}`;
  const mapsHref = `https://www.google.com/maps?q=${MAP_COORDINATES}`;
  const mapsEmbedSrc = `${mapsHref}&output=embed`;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-3 text-[var(--muted)]">
          We&apos;re happy to help with orders, products, or anything else.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-4 rounded-2xl bg-[#0F2D52] p-5 shadow-[var(--shadow-card)] transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-110"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
            <MessageCircle className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-white">Chat with us on WhatsApp</span>
            <span className="mt-0.5 block text-sm text-white/70">
              Fastest way to reach us — {whatsappDisplay}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
        </a>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoCard href={phoneHref} icon={Phone} label="Phone">
            <p className="font-semibold text-[#0F2D52]">{phoneDisplay}</p>
          </InfoCard>
          <InfoCard href={emailHref} icon={Mail} label="Email">
            <p className="font-semibold text-[#0F2D52] break-all">{general.email}</p>
          </InfoCard>
          <InfoCard href={mapsHref} icon={MapPin} label="Address">
            <p className="font-medium">{general.address}</p>
          </InfoCard>
          <InfoCard icon={Clock} label="Business Hours">
            <p className="font-medium">{formatBusinessHoursSummary(general.businessHours)}</p>
            <span
              className={`mt-2 inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-semibold ${
                isOpen ? "bg-[var(--color-success)]/15 text-[var(--color-success)]" : "bg-black/5 text-[var(--color-text-secondary)]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-[var(--color-success)]" : "bg-[var(--color-text-secondary)]"}`}
                aria-hidden="true"
              />
              {hoursStatusLabel}
            </span>
          </InfoCard>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
          <iframe
            src={mapsEmbedSrc}
            title="TrendyMall location"
            className="h-[180px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold">Send us a message</h2>
          <div className="mt-4">
            <ContactForm />
          </div>
        </div>

        <p className="text-center text-sm text-[var(--muted)]">
          Looking for a quick answer?{" "}
          <Link href="/faq" className="font-medium underline-offset-2 hover:underline">
            Check our FAQ
          </Link>
        </p>
      </div>
    </div>
  );
}
