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

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="transition-brand rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50"
      >
        {pending ? "…" : published ? "Unpublish" : "Publish"}
      </button>
      {error && <p className="max-w-64 text-right text-xs text-[var(--color-discount)]">{error}</p>}
    </div>
  );
}
