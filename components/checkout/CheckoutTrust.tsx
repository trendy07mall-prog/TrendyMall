import Link from "next/link";
import { getWhatsAppUrl } from "@/lib/site";

/**
 * The three explanatory blocks from the approved checkout design.
 *
 * Every claim here is one the site already makes somewhere else. Three from
 * the mockup were changed because they were not true:
 *
 *  - "receipt" and "tracking details come here" were dropped from the email
 *    box. No email carries an invoice attachment and none contains a
 *    tracking number or link -- lib/email.ts sends confirmation, status and
 *    payment-verified mails, and that is all. Tracking is self-service, so
 *    the box points at /track-order instead.
 *  - "Genuine products" went. The word appears nowhere on this site as a
 *    customer-facing claim, only inside code comments.
 *  - "WhatsApp support daily 10 AM - 4 PM" went. Those are the SHOP's
 *    pickup hours, not stated support hours, so the two are now separate
 *    lines and the hours come from the pickup setting rather than a string
 *    typed here.
 */

function Tick({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-[10px] text-sm leading-[1.5]">
      <span aria-hidden="true" className="font-extrabold text-[#166534]">
        ✓
      </span>
      <span>{children}</span>
    </div>
  );
}

const cardClass =
  "flex flex-col gap-[14px] rounded-2xl border border-[#E5E7EB] bg-white p-6";

/** "Why your email matters" — sits under the email field. */
export function EmailWhyBox() {
  return (
    <div className="flex items-start gap-[14px] rounded-xl border border-[#D6E0EF] bg-[#F1F5FB] p-4">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--pf-navy)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="mt-[2px] shrink-0"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
      <div className="flex flex-col gap-[6px]">
        <div className="text-sm font-extrabold text-[var(--pf-navy)]">Why your email matters</div>
        <ul className="m-0 list-none p-0 text-[13px] leading-[1.55] text-[#1F2937]">
          <li>✓ Your order confirmation arrives here</li>
          <li>✓ We send your order updates here</li>
          <li>✓ We use it to reach you if there is any problem with your order</li>
        </ul>
        <div className="text-[13px] leading-[1.55] text-[#1F2937]">
          You can track your order any time on our{" "}
          <Link href="/track-order" className="font-bold underline">
            Track Order page
          </Link>
          .
        </div>
        <div className="text-xs text-[#374151]">
          Please check the spelling. A wrong email means you won&apos;t get your confirmation.
        </div>
      </div>
    </div>
  );
}

export function ShopWithConfidence({
  whatsappNumber,
  pickupAddress,
  pickupHours,
}: {
  whatsappNumber: string;
  pickupAddress: string;
  pickupHours: string;
}) {
  return (
    <section className={cardClass}>
      <h2 className="m-0 text-base font-extrabold">Shop with confidence</h2>
      <Tick>
        <b>Cash on Delivery</b> available. You pay when it is in your hands.
      </Tick>
      <Tick>
        <b>Easy order tracking</b> after you order.
      </Tick>
      <Tick>
        <b>48-hour return window</b> for damaged, defective or wrong items.
      </Tick>
      <Tick>
        <b>Warranty</b> as stated on each product.
      </Tick>
      <Tick>
        Questions?{" "}
        <a
          href={getWhatsAppUrl(undefined, whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline"
        >
          Message us on WhatsApp
        </a>
      </Tick>
      <Tick>
        <b>Shop open</b> {pickupHours}.
      </Tick>
      <Tick>
        <b>Visit our shop:</b> {pickupAddress}.
      </Tick>
    </section>
  );
}

/**
 * Two steps, not three. The mockup's middle step -- "we confirm it with you
 * on WhatsApp or by phone" -- was removed: nothing in this codebase does
 * that automatically, so it would have been a promise the system does not
 * keep.
 */
export function WhatHappensNext() {
  const steps = ["You get a confirmation email", "The rider delivers and you pay in cash"];
  return (
    <section className={cardClass}>
      <h2 className="m-0 text-base font-extrabold">What happens next</h2>
      <ol className="m-0 flex list-none flex-col gap-[14px] p-0">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--pf-navy)] text-xs font-extrabold text-white"
            >
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
