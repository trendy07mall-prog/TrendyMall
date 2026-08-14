"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HeroSlideForm } from "@/components/admin/HeroSlideForm";
import { toggleHeroSlideStatus, reorderHeroSlides, deleteHeroSlide } from "@/lib/admin/hero-slides";
import { useToast } from "@/components/admin/ToastProvider";
import type { AdminHeroSlide } from "@/lib/admin/hero-slides-query";

type EditingState = { mode: "new" } | { mode: "edit"; data: AdminHeroSlide } | null;

// Modeled directly on CampaignsManager.tsx (list + inline form toggled by
// local state, no separate /new or /edit routes). Simpler than campaigns
// here: getAdminHeroSlides() already returns every field a slide needs to
// edit (no nested sections/items to fetch separately), so opening Edit
// doesn't need an async load.
export function HeroSlideManager({ slides }: { slides: AdminHeroSlide[] }) {
  const [editing, setEditing] = useState<EditingState>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleQuickToggle(slide: AdminHeroSlide, next: "published" | "disabled") {
    startTransition(async () => {
      const result = await toggleHeroSlideStatus(slide.id, next);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(next === "published" ? "Slide published" : "Slide disabled");
        router.refresh();
      }
    });
  }

  function handleMove(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    startTransition(async () => {
      const result = await reorderHeroSlides(reordered.map((s) => s.id));
      if (result.error) showToast(result.error, "error");
      else router.refresh();
    });
  }

  function handleDelete(slide: AdminHeroSlide) {
    if (!window.confirm(`Delete "${slide.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteHeroSlide(slide.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Slide deleted");
        router.refresh();
      }
    });
  }

  if (editing !== null) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to hero slides
        </button>
        <HeroSlideForm
          initial={editing.mode === "edit" ? editing.data : null}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing({ mode: "new" })}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Slide
      </button>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Slide</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Order</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slides.map((slide, index) => (
              <tr key={slide.id} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-3">
                    <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/5">
                      <Image src={slide.desktop_image_url} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <span className="max-w-xs truncate font-medium">{slide.title}</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">
                  {slide.start_at ? new Date(slide.start_at).toLocaleDateString() : "—"}
                  {" – "}
                  {slide.end_at ? new Date(slide.end_at).toLocaleDateString() : "—"}
                </td>
                <td className="py-2 pr-4">
                  <span className="w-fit border border-current px-2 py-0.5 text-xs uppercase tracking-wide">
                    {slide.status}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pending || index === 0}
                      onClick={() => handleMove(index, -1)}
                      aria-label="Move up"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={pending || index === slides.length - 1}
                      onClick={() => handleMove(index, 1)}
                      aria-label="Move down"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing({ mode: "edit", data: slide })}
                      className="text-sm underline"
                    >
                      Edit
                    </button>
                    {slide.status === "published" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleQuickToggle(slide, "disabled")}
                        className="text-sm underline disabled:opacity-50"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleQuickToggle(slide, "published")}
                        className="text-sm underline disabled:opacity-50"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDelete(slide)}
                      className="text-sm text-[var(--color-error)] underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {slides.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted)]">
                  No hero slides yet — the homepage hero will be hidden until you add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
