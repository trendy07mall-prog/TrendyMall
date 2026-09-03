// The ONE status-pill component for the whole site -- admin lists
// (Categories/Brands/Tags/Coupons/Campaigns/Hero Slides/Delivery Zones/
// Products/Orders/Payments/Reviews) and the customer account area
// (Addresses' "Default" tag, My Reviews' moderation state) all render their
// status through this instead of each hand-rolling its own border/pill/
// plain-text treatment -- previously at least 6 different ad-hoc shapes
// existed for the same "is this active/pending/etc." concept, which is
// exactly the kind of drift a shared component exists to prevent.
export type StatusTone = "success" | "neutral" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<StatusTone, string> = {
  // Active / Published / Enabled / Paid / Delivered / Approved.
  success: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  // Inactive / Disabled / Draft / plain informational tags (e.g. "Default").
  neutral: "bg-black/5 text-[var(--color-text-secondary)]",
  // Pending / Scheduled / awaiting action.
  warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  // Cancelled / Rejected / Failed / Not published.
  danger: "bg-[var(--color-discount)]/15 text-[var(--color-discount)]",
  // In-progress states that are neither a clean success nor a warning
  // (e.g. an order that's shipped but not yet delivered).
  info: "bg-[var(--foreground)]/8 text-[var(--foreground)]",
};

export function StatusBadge({
  tone,
  children,
  // Short single-word statuses (Active/Inactive/Draft/Pending) read best
  // uppercase, matching how most of these already looked before this
  // component existed -- longer, sentence-like labels (e.g. "Pending
  // moderation") opt out since shouting a whole phrase reads worse than
  // just the one word did.
  uppercase = true,
  className = "",
}: {
  tone: StatusTone;
  children: React.ReactNode;
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
        uppercase ? "uppercase tracking-wide" : ""
      } ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
