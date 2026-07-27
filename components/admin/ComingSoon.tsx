export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
        <Icon className="h-6 w-6 text-[var(--color-text-secondary)]" />
      </div>
      <h1 className="font-heading mt-4 text-xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--muted)]">{description}</p>
      <span className="mt-4 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
        Coming soon
      </span>
    </div>
  );
}
