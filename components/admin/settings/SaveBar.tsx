export type SaveStatus = "idle" | "saving" | "saved" | "error";

// Shared by every Settings form (Phase 1 and later phases) -- no silent
// failures: idle shows a plain Save Changes button, saving disables it,
// saved confirms with a checkmark that fades back to idle-styling on the
// next edit (the parent form clears status on change), error surfaces the
// real message from lib/admin/settings.ts's updateSettings().
export function SaveBar({
  status,
  errorMessage,
  isDirty,
  onSave,
}: {
  status: SaveStatus;
  errorMessage?: string;
  isDirty: boolean;
  onSave: () => void;
}) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-8 flex items-center justify-between gap-4 border-t border-[var(--border)] bg-[var(--color-card)] px-6 py-4">
      <div className="min-h-5 text-sm">
        {status === "error" && (
          <span className="text-[var(--color-error)]">{errorMessage ?? "Something went wrong."}</span>
        )}
        {status === "saved" && <span className="text-[var(--color-success)]">Saved ✓</span>}
        {status === "idle" && isDirty && (
          <span className="text-[var(--color-text-secondary)]">Unsaved changes</span>
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={status === "saving" || !isDirty}
        className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        {status === "saving" ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
