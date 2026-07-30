"use client";

import type { ComponentType } from "react";

export function PaymentMethodCard({
  icon: Icon,
  title,
  description,
  selected,
  disabled,
  comingSoon,
  onSelect,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`transition-brand flex w-full items-center gap-3 rounded-[var(--radius-card)] border p-4 text-left ${
        selected
          ? "border-2 border-[var(--foreground)]"
          : "border-[var(--border)] hover:border-[var(--border-hover)]"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <Icon className="h-6 w-6 shrink-0" />
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          {title}
          {comingSoon && (
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
              Coming Soon
            </span>
          )}
        </span>
        <span className="block text-xs text-[var(--muted)]">{description}</span>
      </span>
    </button>
  );
}
