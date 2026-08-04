"use client";

import { useActionState, useEffect } from "react";
import type { AttributeFormState } from "@/lib/admin/attributes";
import type { Attribute } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function AttributeForm({
  attribute,
  action,
  onSaved,
}: {
  attribute: Attribute | null;
  action: (state: AttributeFormState, formData: FormData) => Promise<AttributeFormState>;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  useEffect(() => {
    if (state && "success" in state) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={attribute?.name ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug (optional — auto-generated from the name if blank)
        </label>
        <input id="slug" name="slug" type="text" defaultValue={attribute?.slug ?? ""} className={inputClass} />
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Attribute"}
      </button>
    </form>
  );
}
