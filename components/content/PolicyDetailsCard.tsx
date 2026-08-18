import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/FadeIn";

// Shared "full policy text" card for the redesigned Shipping/Returns/
// Warranty pages -- the new visual sections (rate cards, comparisons,
// numbered flows) summarize the policy, but the complete admin-editable
// text (policies.shippingBody/returnsBody/warrantyBody, still rendered via
// the exact same dangerouslySetInnerHTML mechanism PolicyBody.tsx already
// uses) stays fully present here so nothing the admin wrote is hidden or
// replaced by the new visual summary -- this is the single source of
// truth; the cards above are a hand-maintained restatement of it, not a
// second copy admins edit separately.
export function PolicyDetailsCard({
  title = "Full Policy Details",
  html,
  children,
}: {
  title?: string;
  html: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <div className="mx-auto max-w-3xl rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)] sm:p-8">
            <h2 className="font-heading text-lg font-bold">{title}</h2>
            <div className="prose-editor mt-3 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
            {children}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
