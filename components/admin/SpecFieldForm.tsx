"use client";

import { useActionState, useEffect } from "react";
import type { FieldFormState } from "@/lib/admin/spec-templates";
import type { SpecField } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function SpecFieldForm({
  field,
  action,
  onSaved,
}: {
  field: SpecField | null;
  action: (state: FieldFormState, formData: FormData) => Promise<FieldFormState>;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => {
    if (state && "success" in state) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="label" className="text-sm font-medium">
            Label
          </label>
          <input
            id="label"
            name="label"
            type="text"
            required
            defaultValue={field?.label ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fieldKey" className="text-sm font-medium">
            Key (optional — auto-generated from the label if blank)
          </label>
          <input id="fieldKey" name="fieldKey" type="text" defaultValue={field?.field_key ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="fieldType" className="text-sm font-medium">
            Type
          </label>
          <select id="fieldType" name="fieldType" defaultValue={field?.field_type ?? "text"} className={inputClass}>
            <option value="text">Text</option>
            <option value="boolean">Yes / No</option>
            <option value="list">List</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="unit" className="text-sm font-medium">
            Unit (optional, e.g. mAh, hours)
          </label>
          <input id="unit" name="unit" type="text" defaultValue={field?.unit ?? ""} className={inputClass} />
        </div>
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand self-start rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Field"}
      </button>
    </form>
  );
}
