// product.whats_in_box is a plain list of item names, shown verbatim as one
// compact dot-separated run of text that wraps instead of a tile per item.
export function WhatsInBox({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4">
      <h2 className="subheading text-base">What&apos;s in the box</h2>
      <ul className="mt-1.5 text-sm leading-normal break-words text-[#4b5563]">
        {items.map((item, index) => (
          <li key={index} className="inline">
            {index > 0 && (
              <span aria-hidden="true" className="mx-1.5 text-[var(--color-text-secondary)]">
                ·
              </span>
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
