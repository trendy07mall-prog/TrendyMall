export function StockBadge({ stock }: { stock: number }) {
  const state =
    stock <= 0
      ? { color: "bg-[var(--color-discount)]", label: "Out of stock" }
      : stock < 5
        ? { color: "bg-[var(--color-warning)]", label: `Only ${stock} left` }
        : { color: "bg-[var(--color-success)]", label: "In Stock" };

  return (
    <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-[var(--muted)]">
      <span className={`h-1.5 w-1.5 rounded-full ${state.color}`} aria-hidden="true" />
      {state.label}
    </span>
  );
}
