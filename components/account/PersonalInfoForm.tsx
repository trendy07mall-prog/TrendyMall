"use client";

import { useActionState } from "react";
import { updatePersonalInfo } from "@/lib/profile";
import type { Profile } from "@/types";

const inputClass =
  "rounded-[var(--radius-input)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function PersonalInfoForm({
  email,
  profile,
}: {
  email: string;
  profile: Profile | null;
}) {
  const [state, formAction, pending] = useActionState(updatePersonalInfo, undefined);

  return (
    <form action={formAction} className="mt-6 flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className={`${inputClass} text-[var(--muted)]`}
        />
        <p className="text-xs text-[var(--muted)]">Managed by your account sign-in — not editable here.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="fullName" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={profile?.full_name ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="07XXXXXXXX"
          defaultValue={profile?.phone ?? ""}
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-[var(--color-discount)]">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="transition-brand mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
