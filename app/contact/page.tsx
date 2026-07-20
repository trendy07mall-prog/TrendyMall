import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";

export const metadata: Metadata = {
  title: "Contact TrendyMall",
  description:
    "Get in touch with TrendyMall via WhatsApp, phone, or email. Salawatta Road, Wellampitiya, Sri Lanka.",
};

const CONTACT_ITEMS = [
  {
    label: "WhatsApp",
    value: "077 531 2484",
    href: "https://wa.me/94775312484",
  },
  {
    label: "Phone",
    value: "075 018 7145",
    href: "tel:+94750187145",
  },
  {
    label: "Email",
    value: "trendy07mall@gmail.com",
    href: "mailto:trendy07mall@gmail.com",
  },
];

export default function ContactPage() {
  return (
    <PageShell
      title="Contact Us"
      subtitle="We're happy to help with orders, products, or anything else."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CONTACT_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="rounded-[var(--radius-md)] border border-[var(--border)] p-4 transition-colors hover:bg-black/5"
          >
            <p className="text-xs text-[var(--muted)]">{item.label}</p>
            <p className="mt-1 font-medium">{item.value}</p>
          </a>
        ))}
      </div>

      <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] p-4">
        <p className="text-xs text-[var(--muted)]">Address</p>
        <p className="mt-1 font-medium">Salawatta Road, Wellampitiya, Sri Lanka</p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
        <p className="text-xs text-[var(--muted)]">Business Hours</p>
        <p className="mt-1 font-medium">Daily, 10:00 AM – 4:00 PM</p>
      </div>
    </PageShell>
  );
}
