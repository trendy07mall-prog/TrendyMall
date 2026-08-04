"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import { buildCategoryTree, flattenCategoryTree, type CategoryTreeNode } from "@/lib/category-tree";
import {
  createCategory,
  deleteCategory,
  moveCategory,
  reorderCategories,
  toggleCategoryActive,
  updateCategory,
} from "@/lib/admin/categories";
import { ChevronDownIcon, ChevronRightIcon, FolderIcon } from "@/components/ui/Icon";
import type { Category, SpecTemplate } from "@/types";

// Two drop targets per row: dropping on the row's body reparents the
// dragged category to become this row's child; dropping on the thin strip
// above a row makes the dragged category this row's *previous sibling*
// (setting parent_id to match + a sort_order update in one user action) --
// the standard "drop onto = become child, drop between = reorder" tree
// interaction. Native HTML5 drag-and-drop, no new dependency -- nothing in
// this codebase uses one today (the product gallery reorders via plain
// up/down buttons), matching the project's hand-roll-over-install pattern.
export function CategoryTree({
  categories,
  specTemplateOptions,
}: {
  categories: Category[];
  specTemplateOptions: SpecTemplate[];
}) {
  const tree = buildCategoryTree(categories);
  const flat = flattenCategoryTree(tree);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(categories.map((c) => c.id)));
  const [editing, setEditing] = useState<Category | "new" | { parentId: string } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; mode: "into" | "before" } | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleActive(category: Category) {
    startTransition(async () => {
      const result = await toggleCategoryActive(category.id, !category.is_active);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(category.is_active ? "Category deactivated" : "Category activated");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteCategory(deleting.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Category deleted");
        router.refresh();
      }
      setDeleting(null);
    });
  }

  function handleDrop(target: Category, mode: "into" | "before") {
    const dragged = draggedId;
    setDraggedId(null);
    setDropTarget(null);
    if (!dragged || dragged === target.id) return;

    // Can't drop a category onto/before itself or anywhere in its own
    // subtree -- checked here for immediate feedback; the server actions
    // re-check this too (the client's tree snapshot could be stale).
    const draggedNode = flat.find((c) => c.id === dragged);
    if (draggedNode && (target.path === draggedNode.path || target.path.startsWith(`${draggedNode.path}.`))) {
      showToast("Can't move a category inside itself or its own sub-category.", "error");
      return;
    }

    startTransition(async () => {
      if (mode === "into") {
        const result = await moveCategory(dragged, target.id);
        if (result.error) {
          showToast(result.error, "error");
          return;
        }
        setExpanded((prev) => new Set(prev).add(target.id));
      } else {
        const newSiblings = (target.parent_id ? categories.filter((c) => c.parent_id === target.parent_id) : categories.filter((c) => !c.parent_id))
          .filter((c) => c.id !== dragged)
          .sort((a, b) => a.sort_order - b.sort_order);
        const targetIndex = newSiblings.findIndex((c) => c.id === target.id);
        newSiblings.splice(targetIndex, 0, draggedNode ?? target);

        const moveResult = await moveCategory(dragged, target.parent_id);
        if (moveResult.error) {
          showToast(moveResult.error, "error");
          return;
        }
        const reorderResult = await reorderCategories(newSiblings.map((c) => c.id));
        if (reorderResult.error) {
          showToast(reorderResult.error, "error");
          return;
        }
      }
      showToast("Category moved");
      router.refresh();
    });
  }

  if (editing !== null) {
    const isNew = editing === "new" || (typeof editing === "object" && "parentId" in editing);
    const editingCategory = isNew ? null : (editing as Category);
    const defaultParentId = typeof editing === "object" && "parentId" in editing ? editing.parentId : undefined;
    const parentOptions = flat.filter((c) => {
      if (!editingCategory) return true;
      return c.id !== editingCategory.id && !c.path.startsWith(`${editingCategory.path}.`);
    });

    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to categories
        </button>
        <CategoryForm
          category={editingCategory}
          parentOptions={parentOptions}
          defaultParentId={defaultParentId}
          specTemplateOptions={specTemplateOptions}
          action={editingCategory ? updateCategory.bind(null, editingCategory.id) : createCategory}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  function renderNode(node: CategoryTreeNode) {
    const isExpanded = expanded.has(node.id);
    const isDropInto = dropTarget?.id === node.id && dropTarget.mode === "into";
    const isDropBefore = dropTarget?.id === node.id && dropTarget.mode === "before";

    return (
      <div key={node.id}>
        <div
          className={`relative h-1 ${isDropBefore ? "bg-[var(--foreground)]" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget({ id: node.id, mode: "before" });
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(node, "before");
          }}
        />
        <div
          draggable
          onDragStart={() => setDraggedId(node.id)}
          onDragOver={(e) => {
            e.preventDefault();
            setDropTarget({ id: node.id, mode: "into" });
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(node, "into");
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDropTarget(null);
          }}
          style={{ marginLeft: node.depth * 24 }}
          className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-2 ${
            isDropInto ? "border-[var(--foreground)] bg-black/5" : "border-transparent"
          } ${draggedId === node.id ? "opacity-40" : ""} hover:bg-black/5`}
        >
          <button
            type="button"
            onClick={() => toggleExpanded(node.id)}
            className={`flex h-6 w-6 shrink-0 items-center justify-center ${node.children.length === 0 ? "invisible" : ""}`}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>

          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
            {node.image_path ? (
              <Image src={node.image_path} alt="" fill sizes="32px" className="object-cover" />
            ) : (
              <FolderIcon className="h-4 w-4 text-[var(--muted)]" />
            )}
          </span>

          <span className="flex-1 truncate text-sm font-medium">{node.name}</span>
          <span className="text-xs text-[var(--muted)]">{node.slug}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide ${
              node.is_active ? "border-current" : "border-current text-[var(--muted)]"
            }`}
          >
            {node.is_active ? "Active" : "Inactive"}
          </span>

          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => setEditing({ parentId: node.id })} className="text-xs underline">
              Add child
            </button>
            <button type="button" onClick={() => setEditing(node)} className="text-xs underline">
              Edit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleToggleActive(node)}
              className="text-xs underline disabled:opacity-50"
            >
              {node.is_active ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              onClick={() => setDeleting(node)}
              className="text-xs text-red-600 underline"
            >
              Delete
            </button>
          </div>
        </div>

        {isExpanded && node.children.map(renderNode)}
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
        + New Category
      </button>

      <div className="mt-6 flex flex-col rounded-[var(--radius-card)] border border-[var(--border)] p-2">
        {tree.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No categories yet.</p>
        ) : (
          tree.map(renderNode)
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete category?"
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
