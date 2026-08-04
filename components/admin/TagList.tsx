"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TagForm } from "@/components/admin/TagForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import { createTag, deleteTag, toggleTagActive, updateTag } from "@/lib/admin/tags";
import type { Tag } from "@/types";

export function TagList({
  tags,
  productCountByTagId,
}: {
  tags: Tag[];
  productCountByTagId: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Tag | "new" | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleToggleActive(tag: Tag) {
    startTransition(async () => {
      const result = await toggleTagActive(tag.id, !tag.is_active);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(tag.is_active ? "Tag deactivated" : "Tag activated");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteTag(deleting.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Tag deleted");
        router.refresh();
      }
      setDeleting(null);
    });
  }

  if (editing !== null) {
    const editingTag = editing === "new" ? null : editing;
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to tags
        </button>
        <TagForm
          tag={editingTag}
          action={editingTag ? updateTag.bind(null, editingTag.id) : createTag}
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
        onClick={() => setEditing("new")}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Tag
      </button>

      <div className="mt-6 flex flex-col rounded-[var(--radius-card)] border border-[var(--border)] p-2">
        {tags.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No tags yet.</p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-transparent px-2 py-2 hover:bg-black/5"
            >
              <span className="flex-1 truncate text-sm font-medium">{tag.name}</span>
              <span className="text-xs text-[var(--muted)]">{tag.slug}</span>
              <span className="text-xs text-[var(--muted)]">
                {productCountByTagId[tag.id] ?? 0} product
                {(productCountByTagId[tag.id] ?? 0) === 1 ? "" : "s"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide ${
                  tag.is_active ? "border-current" : "border-current text-[var(--muted)]"
                }`}
              >
                {tag.is_active ? "Active" : "Inactive"}
              </span>

              <div className="flex shrink-0 items-center gap-3">
                <button type="button" onClick={() => setEditing(tag)} className="text-xs underline">
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleToggleActive(tag)}
                  className="text-xs underline disabled:opacity-50"
                >
                  {tag.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(tag)}
                  className="text-xs text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete tag?"
          message={`Are you sure you want to delete "${deleting.name}"? This can't be undone.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
