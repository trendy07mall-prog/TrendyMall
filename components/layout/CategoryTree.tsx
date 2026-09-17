"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Icon";
import { categoryIcon, type CategoryNavNode } from "@/lib/category-nav";

// One recursive list, shared by the mobile drawer and the desktop flyout's
// right panel, so "expanding a category shows all of its children, and each
// of those expands the same way" is implemented once at whatever depth the
// data has. Each row owns its own open state, so opening a branch never
// collapses a sibling.
type Variant = "desktop" | "mobile";

// Every row carries an icon chip, at every depth. It shrinks as the rows
// indent so a fourth-level row still has room for its label and stays
// tappable on a 320px screen. Deep categories have no slug-specific icon
// yet, so they get the shared folder fallback from categoryIcon.
function chipSizing(variant: Variant, level: number) {
  if (variant === "desktop") {
    return level === 0
      ? { chip: "h-6 w-6 rounded-md", icon: "h-3.5 w-3.5" }
      : { chip: "h-5 w-5 rounded-md", icon: "h-3 w-3" };
  }
  if (level === 0) return { chip: "h-8 w-8 rounded-lg", icon: "h-4 w-4" };
  if (level === 1) return { chip: "h-7 w-7 rounded-lg", icon: "h-3.5 w-3.5" };
  return { chip: "h-6 w-6 rounded-md", icon: "h-3 w-3" };
}

function CategoryTreeRow({
  node,
  variant,
  level,
  onNavigate,
}: {
  node: CategoryNavNode;
  variant: Variant;
  level: number;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const icon = categoryIcon(node.slug);
  const mobile = variant === "mobile";
  const sizing = chipSizing(variant, level);
  // Tighter gap once rows are indented, to buy back label width.
  const gap = mobile ? (level === 0 ? "gap-3" : "gap-2") : "gap-2";

  const chip = (
    <span
      className={`flex shrink-0 items-center justify-center ${sizing.chip} ${
        open ? "bg-[#F97316]" : "bg-[rgba(15,45,82,0.08)]"
      }`}
    >
      <icon.Icon className={`${sizing.icon} ${open ? "text-white" : "text-[#0F2D52]"}`} />
    </span>
  );

  const rowClass = mobile
    ? `transition-brand flex min-h-11 w-full items-center ${gap} rounded-xl px-3 py-2 text-left ${
        level === 0 ? "text-sm" : "text-[13px]"
      } ${
        open
          ? "bg-[rgba(249,115,22,0.08)] font-semibold text-[#0F2D52]"
          : level === 0
            ? "text-[var(--foreground)] hover:bg-black/5"
            : "text-[var(--color-text-secondary)] hover:bg-black/5"
      }`
    : `transition-brand flex min-h-9 w-full items-center ${gap} rounded-md px-2 py-1.5 text-left text-[13px] ${
        open
          ? "font-semibold text-[#0F2D52]"
          : "text-[var(--color-text-secondary)] hover:text-[#0F2D52] hover:underline"
      }`;

  if (!hasChildren) {
    return (
      <Link
        href={`/category/${node.slug}`}
        onClick={onNavigate}
        className={`${rowClass} hover:text-[#0F2D52]`}
      >
        {chip}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {mobile && <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)]" />}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`category-panel-${node.id}`}
        onClick={() => setOpen((v) => !v)}
        className={rowClass}
      >
        {chip}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        <ChevronDownIcon
          className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${
            mobile ? "h-4 w-4" : "h-3.5 w-3.5"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>
      {/* grid-rows 0fr -> 1fr animates the height without measuring it.
          inert keeps collapsed links out of the tab order while they stay
          in the DOM for that transition. */}
      <div
        id={`category-panel-${node.id}`}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {/* 16px of indent per level: enough to read the nesting, little
              enough that a fourth level still fits a 320px drawer. */}
          <div className="mt-0.5 ml-2 flex flex-col gap-0.5 border-l border-[var(--border)] pl-2">
            <Link
              href={`/category/${node.slug}`}
              onClick={onNavigate}
              className={
                mobile
                  ? "transition-brand flex min-h-11 items-center rounded-xl px-3 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-black/5"
                  : "transition-brand flex min-h-9 items-center rounded-md px-2 py-1.5 text-[13px] font-medium text-[#0F2D52] hover:underline"
              }
            >
              All {node.name}
            </Link>
            {node.children.map((child) => (
              <CategoryTreeRow
                key={child.id}
                node={child}
                variant={variant}
                level={level + 1}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategoryTree({
  nodes,
  variant,
  onNavigate,
}: {
  nodes: CategoryNavNode[];
  variant: Variant;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <CategoryTreeRow
          key={node.id}
          node={node}
          variant={variant}
          level={0}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
