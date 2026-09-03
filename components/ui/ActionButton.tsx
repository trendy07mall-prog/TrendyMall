"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactElement } from "react";

// The ONE action-button component for the whole site, replacing the plain
// underlined text links (`<button className="text-xs underline">Edit</button>`)
// that used to be copy-pasted with slight variations across every admin
// list (Categories/Brands/Tags/Coupons/Campaigns/Hero Slides/Delivery
// Zones/Reviews) and the customer account area (Addresses). Two exports
// sharing one class recipe: ActionButton for onClick/type="submit" actions,
// ActionLinkButton for actions that navigate (Edit -> an edit page, View ->
// the live page) -- kept as two small components rather than one
// polymorphic href-or-onClick component so neither picks up props that
// don't apply to it (a <button> has no href, an <a> has no disabled).
export type ActionTone = "neutral" | "warning" | "danger" | "success";
export type ActionSize = "sm" | "xs";

// neutral: Edit/View/Duplicate/Print/Download -- reversible, non-alarming.
// warning: Deactivate/Disable/Archive -- reversible, but changes visibility.
// danger: Delete/Remove -- reserved for genuinely irreversible actions,
// same red-for-destructive-only rule the rest of the site follows.
// success: Activate/Enable/Approve/Restore -- the positive counterpart to warning.
const TONE_CLASSES: Record<ActionTone, string> = {
  neutral: "border-[var(--border)] text-[var(--foreground)] hover:bg-black/5",
  warning:
    "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20",
  danger:
    "border-[var(--color-discount)]/30 bg-[var(--color-discount)]/10 text-[var(--color-discount)] hover:bg-[var(--color-discount)]/20",
  success:
    "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20",
};

// sm: customer account area's more spacious cards -- also this project's
// established 44px mobile touch-target minimum (AddressesManager's own
// buttons already used min-h-11 for this exact reason).
// xs: admin's dense tables/lists, where a full 44px row would blow out the
// row height across a table with 4+ actions per row.
const SIZE_CLASSES: Record<ActionSize, string> = {
  xs: "gap-1 px-2.5 py-1 text-xs",
  sm: "gap-1.5 px-3.5 py-2 text-sm",
};

const ICON_ONLY_SIZE_CLASSES: Record<ActionSize, string> = {
  xs: "h-7 w-7",
  sm: "h-11 w-11",
};

const ICON_SIZE_CLASSES: Record<ActionSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
};

// Exported so a plain <a> (e.g. a route.ts file-download/print endpoint,
// where Next's <Link> prefetching/soft-navigation doesn't apply) can carry
// the exact same visual treatment as ActionButton/ActionLinkButton without
// going through either.
export function actionButtonClasses(tone: ActionTone, size: ActionSize, iconOnly: boolean) {
  return `transition-brand inline-flex shrink-0 items-center justify-center rounded-full border font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 ${
    TONE_CLASSES[tone]
  } ${iconOnly ? ICON_ONLY_SIZE_CLASSES[size] : SIZE_CLASSES[size]}`;
}

type IconComponent = (props: { className?: string }) => ReactElement;

interface ActionVisualProps {
  // Omitted entirely for a plain text-only button (rare -- most actions
  // should carry an icon per the redesign, but e.g. a lone "+ Add field"
  // row action reads fine as text alone at xs size).
  icon?: IconComponent;
  label: string;
  tone?: ActionTone;
  size?: ActionSize;
  // Renders just the icon in a circular button (aria-label + title carry
  // the label for a11y/tooltip) -- for space-tight contexts, e.g. reorder
  // arrows or a lone "+" add-child button next to a dense table row.
  iconOnly?: boolean;
  className?: string;
}

export function ActionButton({
  icon: Icon,
  label,
  tone = "neutral",
  size = "xs",
  iconOnly = false,
  className = "",
  type = "button",
  ...rest
}: ActionVisualProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  return (
    <button
      type={type}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={`${actionButtonClasses(tone, size, iconOnly)} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={ICON_SIZE_CLASSES[size]} />}
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}

export function ActionLinkButton({
  icon: Icon,
  label,
  tone = "neutral",
  size = "xs",
  iconOnly = false,
  className = "",
  href,
  ...rest
}: ActionVisualProps & { href: string } & Omit<ComponentProps<typeof Link>, "className" | "href">) {
  return (
    <Link
      href={href}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={`${actionButtonClasses(tone, size, iconOnly)} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={ICON_SIZE_CLASSES[size]} />}
      {!iconOnly && <span>{label}</span>}
    </Link>
  );
}
