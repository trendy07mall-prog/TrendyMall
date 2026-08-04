"use client";

import { useActionState, useEffect } from "react";
import type { TagFormState } from "@/lib/admin/tags";
import type { Tag } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function TagForm({
  tag,
  action,
  onSaved,
}: {
  tag: Tag | null;
  action: (state: TagFormState, formData: FormData) => Promise<TagFormState>;
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
          defaultValue={tag?.name ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug (optional — auto-generated from the name if blank)
        </label>
        <input id="slug" name="slug" type="text" defaultValue={tag?.slug ?? ""} className={inputClass} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={tag?.is_active ?? true} />
        Active
      </label>

      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save Tag"}
      </button>
    </form>
  );
}
