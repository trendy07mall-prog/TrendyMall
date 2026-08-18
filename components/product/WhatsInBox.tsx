import { PackageIcon } from "@/components/ui/Icon";

// product.whats_in_box is a plain list of item names -- there is no
// per-item image in the data model, so each card's "thumbnail" is a
// consistent icon tile rather than a fabricated photo.
export function WhatsInBox({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-sm font-semibold">What&apos;s in the box</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-black/5">
              <PackageIcon className="h-5 w-5 text-[var(--muted)]" />
            </span>
            <span className="min-w-0 text-sm font-medium break-words">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
