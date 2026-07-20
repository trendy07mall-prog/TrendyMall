import type { Metadata } from "next";
import { PageShell } from "@/components/content/PageShell";
import { Accordion } from "@/components/content/Accordion";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about TrendyMall delivery, payment, returns, and support.",
};

const FAQ_ITEMS = [
  {
    question: "How long does delivery take?",
    answer:
      "Standard islandwide delivery takes 3–5 business days. Orders are processed within 24 hours after confirmation (excluding Sundays and public holidays).",
  },
  {
    question: "How much does delivery cost?",
    answer:
      "Rs. 255 for Western Province and Colombo 01–15 (including Colombo Fort), and Rs. 400 for areas outside Colombo and the Western Province.",
  },
  {
    question: "Do you offer Cash on Delivery?",
    answer: "Yes, Cash on Delivery (COD) is available for eligible orders across Sri Lanka.",
  },
  {
    question: "Can I track my order?",
    answer:
      "Yes. Once your order is dispatched, you'll receive tracking updates via WhatsApp, SMS, and email.",
  },
  {
    question: "What is your return policy?",
    answer:
      "Returns are accepted only for products that arrive damaged, defective, or incorrectly shipped, and must be requested within 48 hours of delivery. See our Returns & Refunds Policy for full details.",
  },
  {
    question: "How do I contact customer support?",
    answer:
      "WhatsApp us at 077 531 2484, call 075 018 7145, or email trendy07mall@gmail.com. We're available daily from 10am to 4pm.",
  },
];

export default function FaqPage() {
  return (
    <PageShell title="Frequently Asked Questions">
      <Accordion items={FAQ_ITEMS} />
    </PageShell>
  );
}
