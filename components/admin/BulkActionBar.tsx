"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import {
  bulkUpdateStatus,
  bulkSoftDelete,
  bulkDuplicate,
  bulkRestore,
} from "@/lib/admin/products-mutations";
import { exportProductsCsvByIds } from "@/lib/admin/products-export";
import type { BulkResult } from "@/lib/admin/products-mutations";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkActionBar({
  selectedIds,
  onClear,
  isDeletedView = false,
}: {
  selectedIds: string[];
  onClear: () => void;
  isDeletedView?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  function reportBulkResult(result: BulkResult, verb: string) {
    if (result.errors.length > 0) {
      showToast(`${result.successCount} ${verb}, ${result.errors.length} failed`, "error");
    } else {
      showToast(`${result.successCount} product${result.successCount === 1 ? "" : "s"} ${verb}`);
    }
  }

  async function handlePublish() {
    setPending("publish");
    const result = await bulkUpdateStatus(selectedIds, "published");
    setPending(null);
    reportBulkResult(result, "published");
    onClear();
    router.refresh();
  }

  async function handleHide() {
    setPending("hide");
    const result = await bulkUpdateStatus(selectedIds, "draft");
    setPending(null);
    reportBulkResult(result, "set to draft");
    onClear();
    router.refresh();
  }

  async function handleDuplicate() {
    setPending("duplicate");
    const result = await bulkDuplicate(selectedIds);
    setPending(null);
    reportBulkResult(result, "duplicated");
    onClear();
    router.refresh();
  }

  async function handleExport() {
    setPending("export");
    const csv = await exportProductsCsvByIds(selectedIds);
    setPending(null);
    downloadCsv(csv, "trendymall-products-export.csv");
  }

  async function handleDelete() {
    setPending("delete");
    const result = await bulkSoftDelete(selectedIds);
    setPending(null);
    setConfirmOpen(false);
    reportBulkResult(result, "removed");
    onClear();
    router.refresh();
  }

  async function handleRestore() {
    setPending("restore");
    const result = await bulkRestore(selectedIds);
    setPending(null);
    reportBulkResult(result, "restored");
    onClear();
    router.refresh();
  }

  const buttonClass =
    "transition-brand rounded-full border border-white/30 px-3 py-1.5 text-sm font-medium hover:bg-white/10 disabled:opacity-50";

  return (
    <>
      <div className="sticky bottom-4 z-[var(--z-drawer-overlay)] mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-[var(--foreground)] px-4 py-3 text-white shadow-[var(--shadow-card-hover)]">
        <span className="text-sm font-medium">{selectedIds.length} selected</span>
        <div className="flex flex-wrap items-center gap-2">
          {isDeletedView ? (
            <button type="button" onClick={handleRestore} disabled={pending !== null} className={buttonClass}>
              Restore
            </button>
          ) : (
            <>
              <button type="button" onClick={handlePublish} disabled={pending !== null} className={buttonClass}>
                Publish
              </button>
              <button type="button" onClick={handleHide} disabled={pending !== null} className={buttonClass}>
                Hide
              </button>
              <button type="button" onClick={handleDuplicate} disabled={pending !== null} className={buttonClass}>
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={pending !== null}
                className={`${buttonClass} border-[var(--color-discount)] text-[var(--color-discount)]`}
              >
                Delete
              </button>
            </>
          )}
          <button type="button" onClick={handleExport} disabled={pending !== null} className={buttonClass}>
            Export
          </button>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-sm text-white/70 underline hover:text-white"
        >
          Clear selection
        </button>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Delete Products?"
          message={`${selectedIds.length} product${selectedIds.length === 1 ? "" : "s"} will be removed from the store and can be restored later from the Deleted filter.`}
          confirmLabel="Delete"
          destructive
          pending={pending === "delete"}
          onConfirm={handleDelete}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
