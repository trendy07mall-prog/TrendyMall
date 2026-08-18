import type { ReactNode } from "react";

// One bordered card holding every variant attribute row (Colour, Capacity,
// Connector, ...), each row separated by a thin divider -- scales to
// however many attributes a product has (VariantSwatches/AttributeSelector
// each render nothing when their own group is empty, so an all-empty
// product renders no card at all via the caller's own length check).
export function AttributeCard({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)]">
      {children}
    </div>
  );
}
