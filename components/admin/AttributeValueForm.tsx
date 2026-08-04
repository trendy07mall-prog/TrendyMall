"use client";

import { useActionState, useEffect } from "react";
import type { AttributeValueFormState } from "@/lib/admin/attributes";
import type { AttributeValue } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function AttributeValueForm({
  value,
  action,
  onSaved,
}: {
  value: AttributeValue | null;
  action: (state: AttributeValueFormState, formData: FormData) => Promise<AttributeValueFormState>;
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
          <label htmlFor="value" className="text-sm font-medium">
            Value
          </label>
          <input
            id="value"
            name="value"
            type="text"
            required
            defaultValue={value?.value ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="slug" className="text-sm font-medium">
            Slug (optional — auto-generated if blank)
          </label>
          <input id="slug" name="slug" type="text" defaultValue={value?.slug ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="colorHex" className="text-sm font-medium">
          Color swatch (optional — only for Color-type values)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            defaultValue={value?.color_hex ?? "#000000"}
            onChange={(e) => {
              const text = document.getElementById("colorHex") as HTMLInputElement | null;
              if (text) text.value = e.target.value;
            }}
            className="h-9 w-9 shrink-0 cursor-pointer rounded border border-[var(--border)]"
          />
          <input
            id="colorHex"
            name="colorHex"
            type="text"
            placeholder="#FF0000"
            defaultValue={value?.color_hex ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand self-start rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Value"}
      </button>
    </form>
  );
}
