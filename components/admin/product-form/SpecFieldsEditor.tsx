"use client";

import { useState } from "react";
import { TagInput } from "./TagInput";
import type { Category, SpecField, SpecTemplate } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function SpecFieldsEditor({
  categories,
  templatesWithFields,
  categoryId,
  defaultValues,
}: {
  categories: Category[];
  templatesWithFields: { template: SpecTemplate; fields: SpecField[] }[];
  // Live-selected category id (lifted state from ProductForm) -- fields
  // shown here update immediately when the admin changes the category
  // dropdown, not just on initial load.
  categoryId: string;
  defaultValues: Record<string, string>;
}) {
  const category = categories.find((c) => c.id === categoryId);
  const templateEntry = category?.spec_template_id
    ? templatesWithFields.find((t) => t.template.id === category.spec_template_id)
    : undefined;
  const fields = templateEntry?.fields ?? [];

  // List-type values need controlled state -- TagInput doesn't serialize
  // itself to a hidden field, same as compatibleDevices/whatsInBox already
  // aren't. Keyed by field id so switching categories (new field set) just
  // falls back to an empty list for fields with no prior default.
  const [listValues, setListValues] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const field of fields) {
      if (field.field_type !== "list") continue;
      try {
        const parsed = JSON.parse(defaultValues[field.id] ?? "[]");
        initial[field.id] = Array.isArray(parsed) ? parsed : [];
      } catch {
        initial[field.id] = [];
      }
    }
    return initial;
  });

  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Specifications</span>
      {fields.map((field) => {
        if (field.field_type === "boolean") {
          return (
            <div key={field.id} className="flex flex-col gap-1">
              <label htmlFor={`spec-${field.id}`} className="text-sm font-medium">
                {field.label}
              </label>
              <select
                id={`spec-${field.id}`}
                name={`specValue_${field.id}`}
                defaultValue={defaultValues[field.id] === "true" ? "true" : "false"}
                className={inputClass}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          );
        }

        if (field.field_type === "list") {
          const value = listValues[field.id] ?? [];
          return (
            <div key={field.id}>
              <TagInput
                label={field.label}
                value={value}
                onChange={(next) => setListValues((prev) => ({ ...prev, [field.id]: next }))}
              />
              <input type="hidden" name={`specValue_${field.id}`} value={JSON.stringify(value)} />
            </div>
          );
        }

        return (
          <div key={field.id} className="flex flex-col gap-1">
            <label htmlFor={`spec-${field.id}`} className="text-sm font-medium">
              {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </label>
            <input
              id={`spec-${field.id}`}
              name={`specValue_${field.id}`}
              type="text"
              defaultValue={defaultValues[field.id] ?? ""}
              className={inputClass}
            />
          </div>
        );
      })}
    </div>
  );
}
