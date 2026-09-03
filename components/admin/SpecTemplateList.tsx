"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SpecTemplateForm } from "@/components/admin/SpecTemplateForm";
import { SpecFieldForm } from "@/components/admin/SpecFieldForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import {
  createField,
  createTemplate,
  deleteField,
  deleteTemplate,
  reorderFields,
  updateField,
  updateTemplate,
} from "@/lib/admin/spec-templates";
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/ui/Icon";
import { ActionButton } from "@/components/ui/ActionButton";
import type { SpecField, SpecTemplate } from "@/types";

interface TemplateWithFields {
  template: SpecTemplate;
  fields: SpecField[];
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  boolean: "Yes / No",
  list: "List",
};

export function SpecTemplateList({ templatesWithFields }: { templatesWithFields: TemplateWithFields[] }) {
  const [editingTemplate, setEditingTemplate] = useState<SpecTemplate | "new" | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<SpecTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ templateId: string; field: SpecField | "new" } | null>(null);
  const [deletingField, setDeletingField] = useState<SpecField | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleDeleteTemplate() {
    if (!deletingTemplate) return;
    startTransition(async () => {
      const result = await deleteTemplate(deletingTemplate.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Template deleted");
        router.refresh();
      }
      setDeletingTemplate(null);
    });
  }

  function handleDeleteField() {
    if (!deletingField) return;
    startTransition(async () => {
      const result = await deleteField(deletingField.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Field deleted");
        router.refresh();
      }
      setDeletingField(null);
    });
  }

  function moveField(fields: SpecField[], fieldId: string, direction: -1 | 1) {
    const index = fields.findIndex((f) => f.id === fieldId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= fields.length) return;

    const reordered = [...fields];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    startTransition(async () => {
      const result = await reorderFields(reordered.map((f) => f.id));
      if (result.error) showToast(result.error, "error");
      else router.refresh();
    });
  }

  if (editingTemplate !== null) {
    const template = editingTemplate === "new" ? null : editingTemplate;
    return (
      <div>
        <button type="button" onClick={() => setEditingTemplate(null)} className="mb-4 text-sm text-[var(--muted)] underline">
          ← Back to templates
        </button>
        <SpecTemplateForm
          template={template}
          action={template ? updateTemplate.bind(null, template.id) : createTemplate}
          onSaved={() => {
            setEditingTemplate(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  if (editingField !== null) {
    const field = editingField.field === "new" ? null : editingField.field;
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditingField(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to template
        </button>
        <SpecFieldForm
          field={field}
          action={field ? updateField.bind(null, field.id) : createField.bind(null, editingField.templateId)}
          onSaved={() => {
            setEditingField(null);
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
        onClick={() => setEditingTemplate("new")}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Template
      </button>

      <div className="mt-6 flex flex-col gap-2">
        {templatesWithFields.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No templates yet.</p>
        ) : (
          templatesWithFields.map(({ template, fields }) => {
            const isExpanded = expandedId === template.id;
            return (
              <div key={template.id} className="rounded-[var(--radius-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </button>
                  <span className="flex-1 truncate text-sm font-medium">{template.name}</span>
                  <span className="text-xs text-[var(--muted)]">{template.slug}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {fields.length} field{fields.length === 1 ? "" : "s"}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <ActionButton icon={PencilIcon} label="Edit" onClick={() => setEditingTemplate(template)} />
                    <ActionButton
                      icon={TrashIcon}
                      label="Delete"
                      tone="danger"
                      onClick={() => setDeletingTemplate(template)}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex flex-col gap-2 border-t border-[var(--border)] p-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-transparent px-2 py-1.5 hover:bg-black/5"
                      >
                        <span className="flex-1 truncate text-sm">{field.label}</span>
                        <span className="text-xs text-[var(--muted)]">{FIELD_TYPE_LABELS[field.field_type]}</span>
                        {field.unit && <span className="text-xs text-[var(--muted)]">({field.unit})</span>}
                        <div className="flex shrink-0 items-center gap-2">
                          <ActionButton
                            icon={ChevronUpIcon}
                            label="Move up"
                            iconOnly
                            disabled={pending || index === 0}
                            onClick={() => moveField(fields, field.id, -1)}
                          />
                          <ActionButton
                            icon={ChevronDownIcon}
                            label="Move down"
                            iconOnly
                            disabled={pending || index === fields.length - 1}
                            onClick={() => moveField(fields, field.id, 1)}
                          />
                          <ActionButton
                            icon={PencilIcon}
                            label="Edit"
                            onClick={() => setEditingField({ templateId: template.id, field })}
                          />
                          <ActionButton
                            icon={TrashIcon}
                            label="Delete"
                            tone="danger"
                            onClick={() => setDeletingField(field)}
                          />
                        </div>
                      </div>
                    ))}
                    <ActionButton
                      icon={PlusIcon}
                      label="Add field"
                      onClick={() => setEditingField({ templateId: template.id, field: "new" })}
                      className="self-start"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {deletingTemplate && (
        <ConfirmDialog
          title="Delete template?"
          message={`Are you sure you want to delete "${deletingTemplate.name}"? This can't be undone.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={handleDeleteTemplate}
          onClose={() => setDeletingTemplate(null)}
        />
      )}
      {deletingField && (
        <ConfirmDialog
          title="Delete field?"
          message={`Are you sure you want to delete "${deletingField.label}"? This can't be undone.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={handleDeleteField}
          onClose={() => setDeletingField(null)}
        />
      )}
    </div>
  );
}
