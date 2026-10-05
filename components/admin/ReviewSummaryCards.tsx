import Link from "next/link";
import { ClockIcon, ListIcon, MailIcon, StarIcon } from "@/components/ui/Icon";
import type { ReviewCounts } from "@/lib/admin/reviews-query";

// The four count boxes. Same shape and scroll behaviour as
// ProductSummaryCards, so the Reviews page reads as part of the same
// admin rather than a separate app.
//
// Two of them link somewhere: "Needs reply" and "Pending" are the two
// numbers an admin sees and immediately wants to act on, so they go
// straight to that tab. Total and Average rating are facts, not queues,
// and stay inert.
export function ReviewSummaryCards({ counts }: { counts: ReviewCounts }) {
  const cards = [
    { label: "Total Reviews", value: String(counts.total), icon: ListIcon, href: null },
    {
      label: "Need a Reply",
      value: String(counts.needsReply),
      icon: MailIcon,
      href: "/admin/reviews?filter=needs-reply",
    },
    {
      label: "Waiting for Approval",
      value: String(counts.pending),
      icon: ClockIcon,
      href: "/admin/reviews?filter=pending",
    },
    {
      // An em dash rather than "0.0" when there is nothing to average --
      // a zero here would read as "customers rate us zero".
      label: "Average Rating",
      value: counts.averageRating === null ? "—" : counts.averageRating.toFixed(1),
      icon: StarIcon,
      href: null,
    },
  ];

  return (
    <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:pb-0">
      {cards.map((card) => {
        const wrapperClassName = "w-[68%] shrink-0 snap-start sm:w-auto";
        const body = (
          <div className="transition-brand flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-card-hover)]">
            <card.icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{card.label}</p>
          </div>
        );

        return card.href ? (
          <Link key={card.label} href={card.href} className={wrapperClassName}>
            {body}
          </Link>
        ) : (
          <div key={card.label} className={wrapperClassName}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
