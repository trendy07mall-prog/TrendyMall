export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="mt-3 text-[var(--muted)]">{subtitle}</p>}
      <div className="mt-8 flex flex-col gap-4 text-sm leading-relaxed text-[var(--foreground)]">
        {children}
      </div>
    </div>
  );
}
