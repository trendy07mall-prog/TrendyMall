export function WhatsInBox({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold">What&apos;s in the box</h2>
      <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
