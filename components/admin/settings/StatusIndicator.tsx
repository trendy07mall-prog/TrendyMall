// Small ● Active / ○ Disabled badge for settings that visibly affect the
// live storefront right now (Announcement bar enabled, WhatsApp button
// enabled) -- not used on settings that are informational/reference-only
// (e.g. Branding colors, per the WCAG guardrail decision).
export function StatusIndicator({
  active,
  activeLabel = "Active",
  inactiveLabel = "Disabled",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
          : "bg-black/5 text-[var(--color-text-secondary)]"
      }`}
    >
      {active ? "●" : "○"} {active ? activeLabel : inactiveLabel}
    </span>
  );
}
