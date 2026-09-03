import { StatusBadge } from "@/components/ui/StatusBadge";

// Active/Disabled badge for settings that visibly affect the live
// storefront right now (Announcement bar enabled, WhatsApp button enabled)
// -- not used on settings that are informational/reference-only (e.g.
// Branding colors, per the WCAG guardrail decision). Thin wrapper over the
// shared StatusBadge (site-wide pill component) so this settings-specific
// active/inactiveLabel API stays put for its existing callers while the
// actual pill markup/colors live in exactly one place.
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
    <StatusBadge tone={active ? "success" : "neutral"} uppercase={false}>
      {active ? activeLabel : inactiveLabel}
    </StatusBadge>
  );
}
