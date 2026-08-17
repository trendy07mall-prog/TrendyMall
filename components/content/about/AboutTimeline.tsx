import { FadeIn } from "@/components/motion/FadeIn";

type PointStatus = "done" | "current" | "future";

const POINTS: { label: string; status: PointStatus; description: string }[] = [
  {
    label: "2021",
    status: "done",
    description: "TrendyMall began, selling mobile accessories through third-party marketplaces like Daraz.",
  },
  {
    label: "Growth",
    status: "done",
    description: "As our catalog and customer base grew, the costs and limits of relying on a third-party platform became clear.",
  },
  {
    label: "Today",
    status: "current",
    description: "We run TrendyMall as our own direct-to-customer store, with more control over pricing and service.",
  },
  {
    label: "Next",
    status: "future",
    description: "Growing our catalog and laying the groundwork for a fairer marketplace model.",
  },
];

const STATUS_STYLES: Record<PointStatus, { dot: string; label: string; text: string }> = {
  done: { dot: "bg-[#16A34A]", label: "text-[#16A34A]", text: "text-[var(--foreground)]" },
  current: { dot: "bg-[#0F2D52]", label: "text-[#0F2D52]", text: "text-[var(--foreground)]" },
  future: { dot: "bg-black/15", label: "text-[var(--muted)]", text: "text-[var(--muted)]" },
};

export function AboutTimeline() {
  return (
    <section id="our-story" className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-sm font-semibold tracking-wide text-[#16A34A] uppercase">Our Story</p>
        <h2 className="font-heading mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          From a third-party storefront to our own direct store
        </h2>
      </FadeIn>

      {/* Vertical rail on mobile, horizontal connecting line on desktop --
          same list, just a different flex axis + connector orientation. */}
      <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-4">
        {POINTS.map((point, index) => {
          const styles = STATUS_STYLES[point.status];
          return (
            <FadeIn key={point.label} delay={index * 0.08} className="flex-1">
              <div className="flex gap-4 sm:flex-col sm:gap-0">
                <div className="flex flex-col items-center sm:w-full sm:flex-row">
                  <span className={`h-4 w-4 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
                  {index < POINTS.length - 1 && (
                    <span
                      className="w-px flex-1 bg-[var(--border)] sm:h-px sm:w-full sm:flex-1"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="sm:mt-4">
                  <p className={`text-sm font-bold uppercase tracking-wide ${styles.label}`}>{point.label}</p>
                  <p className={`mt-1 text-sm leading-relaxed ${styles.text}`}>{point.description}</p>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}
