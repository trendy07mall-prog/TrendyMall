"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBundlePublished } from "@/lib/admin/bundles";

// Publish / unpublish from the list, without opening the form.
//
// Publishing re-checks the contents server-side even though the save
// already did: an item can be unpublished or deleted in between, and
// publishing is the moment the bundle becomes buyable. If that check
// fails, the reason is shown here rather than swallowed.
export function BundlePublishToggle({
  bundleId,
  published,
}: {
  bundleId: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setBundlePublished(bundleId, !published);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  // The admin's own two button styles, unchanged from every other
  // screen: solid #111111 for the action that does something, a plain
  // bordered button for the one that steps back. Behaviour above is
  // untouched -- this is the same button it always was.
  const className = published
    ? "transition-brand inline-flex w-full items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50 sm:w-auto"
    : "transition-brand inline-flex w-full items-center justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50 sm:w-auto";

  return (
    <div className="flex flex-col gap-1 sm:items-end">
      <button type="button" onClick={toggle} disabled={pending} className={className}>
        {pending ? "…" : published ? "Unpublish" : "Publish"}
      </button>
      {error && (
        <p className="max-w-64 text-xs sm:text-right" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
