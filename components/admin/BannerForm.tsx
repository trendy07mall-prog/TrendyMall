"use client";

import { useActionState } from "react";
import { saveBanner } from "@/lib/admin/banner";
import type { SiteBanner } from "@/types";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function BannerForm({ banner }: { banner: SiteBanner | null }) {
  const [state, formAction, pending] = useActionState(saveBanner, undefined);

  return (
    <form action={formAction} className="mt-8 flex max-w-lg flex-col gap-4">
      <input type="hidden" name="id" defaultValue={banner?.id ?? ""} />

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <input
          id="message"
          name="message"
          type="text"
          required
          defaultValue={banner?.message ?? ""}
          placeholder="e.g. Free islandwide delivery this week only!"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="linkUrl" className="text-sm font-medium">
          Link (optional)
        </label>
        <input
          id="linkUrl"
          name="linkUrl"
          type="text"
          defaultValue={banner?.link_url ?? ""}
          placeholder="/shop"
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={banner?.is_active ?? false} />
        Show on the site
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 self-start rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
