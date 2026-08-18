import { ShieldIcon, CheckIcon, CloseIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";

// The one hard requirement for this page: never imply every product
// carries a warranty. The real data model backs this up exactly --
// warranty is a per-product boolean (products.warranty_available), shown
// via a badge only on products that actually have it (TrustBadges.tsx),
// not a blanket site-wide promise. This section states that plainly
// rather than listing invented coverage terms/durations that don't exist
// anywhere in this store's data yet.
export function WarrantyAvailabilitySection() {
  return (
    <section className="bg-white px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <div className="mx-auto w-full max-w-[var(--container-width)]">
        <FadeIn>
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <ShieldIcon className="h-10 w-10 shrink-0 text-[#0F2D52]" />
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Warranty depends on the product
            </h2>
            <p className="text-sm text-[var(--muted)] sm:text-base">
              Warranty availability and duration depend on the product and are shown where applicable —
              not every product on TrendyMall carries a warranty.
            </p>
          </div>
        </FadeIn>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          <FadeIn>
            <div className="h-full rounded-[var(--radius-card)] border border-[#16A34A]/30 bg-[#16A34A]/5 p-[var(--card-padding)]">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#16A34A] uppercase tracking-wide">
                <CheckIcon className="h-4 w-4 shrink-0" />
                How to check
              </h3>
              <p className="mt-3 text-sm">
                Look for a &quot;Warranty Included&quot; badge on a product&apos;s page — that&apos;s the
                definitive source for whether that specific item is covered.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <div className="h-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-[var(--card-padding)]">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                <CloseIcon className="h-4 w-4 shrink-0" />
                No badge shown
              </h3>
              <p className="mt-3 text-sm text-[var(--muted)]">
                If a product listing doesn&apos;t show a warranty badge, that item is sold without one.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
