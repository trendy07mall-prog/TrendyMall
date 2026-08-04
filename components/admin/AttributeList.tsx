"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AttributeForm } from "@/components/admin/AttributeForm";
import { AttributeValueForm } from "@/components/admin/AttributeValueForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import {
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
  reorderAttributeValues,
  updateAttribute,
  updateAttributeValue,
} from "@/lib/admin/attributes";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Icon";
import type { Attribute, AttributeValue } from "@/types";

interface AttributeWithValues {
  attribute: Attribute;
  values: AttributeValue[];
}

export function AttributeList({ attributesWithValues }: { attributesWithValues: AttributeWithValues[] }) {
  const [editingAttribute, setEditingAttribute] = useState<Attribute | "new" | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<Attribute | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{ attributeId: string; value: AttributeValue | "new" } | null>(
    null,
  );
  const [deletingValue, setDeletingValue] = useState<AttributeValue | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleDeleteAttribute() {
    if (!deletingAttribute) return;
    startTransition(async () => {
      const result = await deleteAttribute(deletingAttribute.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Attribute deleted");
        router.refresh();
      }
      setDeletingAttribute(null);
    });
  }

  function handleDeleteValue() {
    if (!deletingValue) return;
    startTransition(async () => {
      const result = await deleteAttributeValue(deletingValue.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Value deleted");
        router.refresh();
      }
      setDeletingValue(null);
    });
  }

  function moveValue(values: AttributeValue[], valueId: string, direction: -1 | 1) {
    const index = values.findIndex((v) => v.id === valueId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= values.length) return;

    const reordered = [...values];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    startTransition(async () => {
      const result = await reorderAttributeValues(reordered.map((v) => v.id));
      if (result.error) showToast(result.error, "error");
      else router.refresh();
    });
  }

  if (editingAttribute !== null) {
    const attribute = editingAttribute === "new" ? null : editingAttribute;
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditingAttribute(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to attributes
        </button>
        <AttributeForm
          attribute={attribute}
          action={attribute ? updateAttribute.bind(null, attribute.id) : createAttribute}
          onSaved={() => {
            setEditingAttribute(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  if (editingValue !== null) {
    const value = editingValue.value === "new" ? null : editingValue.value;
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditingValue(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to attribute
        </button>
        <AttributeValueForm
          value={value}
          action={value ? updateAttributeValue.bind(null, value.id) : createAttributeValue.bind(null, editingValue.attributeId)}
          onSaved={() => {
            setEditingValue(null);
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
        onClick={() => setEditingAttribute("new")}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Attribute
      </button>

      <div className="mt-6 flex flex-col gap-2">
        {attributesWithValues.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No attributes yet.</p>
        ) : (
          attributesWithValues.map(({ attribute, values }) => {
            const isExpanded = expandedId === attribute.id;
            return (
              <div key={attribute.id} className="rounded-[var(--radius-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : attribute.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </button>
                  <span className="flex-1 truncate text-sm font-medium">{attribute.name}</span>
                  <span className="text-xs text-[var(--muted)]">{attribute.slug}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {values.length} value{values.length === 1 ? "" : "s"}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <button type="button" onClick={() => setEditingAttribute(attribute)} className="text-xs underline">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingAttribute(attribute)}
                      className="text-xs text-red-600 underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-2 border-t border-[var(--border)] p-3">
                    {values.map((value, index) => (
                      <div
                        key={value.id}
                        className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-transparent px-2 py-1.5 hover:bg-black/5"
                      >
                        {value.color_hex && (
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]"
                            style={{ backgroundColor: value.color_hex }}
                            aria-hidden="true"
                          />
                        )}
                        <span className="flex-1 truncate text-sm">{value.value}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            disabled={pending || index === 0}
                            onClick={() => moveValue(values, value.id, -1)}
                            className="text-xs underline disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={pending || index === values.length - 1}
                            onClick={() => moveValue(values, value.id, 1)}
                            className="text-xs underline disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingValue({ attributeId: attribute.id, value })}
                            className="text-xs underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingValue(value)}
                            className="text-xs text-red-600 underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setEditingValue({ attributeId: attribute.id, value: "new" })}
                      className="self-start text-xs underline"
                    >
                      + Add value
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {deletingAttribute && (
        <ConfirmDialog
          title="Delete attribute?"
          message={`Are you sure you want to delete "${deletingAttribute.name}"? This can't be undone.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={handleDeleteAttribute}
          onClose={() => setDeletingAttribute(null)}
        />
      )}
      {deletingValue && (
        <ConfirmDialog
          title="Delete value?"
          message={`Are you sure you want to delete "${deletingValue.value}"? This can't be undone.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={handleDeleteValue}
          onClose={() => setDeletingValue(null)}
        />
      )}
    </div>
  );
}
