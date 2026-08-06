"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import { bulkConfirmOrders, bulkCancelOrders } from "@/lib/admin/orderActions";
import { exportOrdersCsvByIds } from "@/lib/admin/orders-export";
import { getBulkInvoicePdfBase64, getBulkShippingLabelsPdfBase64 } from "@/lib/admin/orders-bulk-print";
import type { BulkOrderActionResult } from "@/lib/admin/orderActions";
import type { AdminOrderTab } from "@/lib/admin/orderStatusFlow";

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: contentType });
}

// Same sticky-bottom-bar shell as BulkActionBar.tsx (products), but the
// available actions are gated by the current tab — bulk Confirm/Cancel go
// through the exact same single-order server actions as the row-level
// buttons (confirmOrder/cancelOrder looped, see bulkConfirmOrders/
// bulkCancelOrders), so a bulk confirm fires the same email a single
// confirm does, and a bulk cancel restores stock the same way.
export function OrderBulkActionBar({
  selectedIds,
  tab,
  onClear,
}: {
  selectedIds: string[];
  tab: AdminOrderTab;
  onClear: () => void;
}) {
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const { showToast } = useToast();
  const router = useRouter();

  function reportBulkResult(result: BulkOrderActionResult, verb: string) {
    if (result.errors.length > 0) {
      showToast(`${result.successCount} ${verb}, ${result.errors.length} failed`, "error");
    } else {
      showToast(`${result.successCount} order${result.successCount === 1 ? "" : "s"} ${verb}`);
    }
  }

  async function handleConfirm() {
    setPending("confirm");
    const result = await bulkConfirmOrders(selectedIds);
    setPending(null);
    reportBulkResult(result, "confirmed");
    onClear();
    router.refresh();
  }

  async function handleCancel() {
    setPending("cancel");
    const result = await bulkCancelOrders(selectedIds);
    setPending(null);
    setConfirmCancelOpen(false);
    reportBulkResult(result, "cancelled");
    onClear();
    router.refresh();
  }

  // The new tab has to open synchronously, inside this click handler, or
  // browsers drop the "user gesture" context that lets window.open through
  // at all -- opening it AFTER the awaited PDF-generation call below gets
  // blocked exactly like the old one-window-per-order loop did. Instead,
  // open a blank tab now and navigate it once the combined PDF is ready.
  function handlePrintInvoice() {
    setPending("print-invoice");
    const win = window.open("", "_blank");
    (async () => {
      try {
        const base64 = await getBulkInvoicePdfBase64(selectedIds);
        if (!win) {
          showToast("Enable popups to print invoices", "error");
          return;
        }
        const blob = base64ToBlob(base64, "application/pdf");
        win.location.href = URL.createObjectURL(blob);
      } catch {
        win?.close();
        showToast("Failed to generate invoices", "error");
      } finally {
        setPending(null);
      }
    })();
  }

  function handlePrintShippingLabels() {
    setPending("print-labels");
    const win = window.open("", "_blank");
    (async () => {
      try {
        const base64 = await getBulkShippingLabelsPdfBase64(selectedIds);
        if (!win) {
          showToast("Enable popups to print shipping labels", "error");
          return;
        }
        const blob = base64ToBlob(base64, "application/pdf");
        win.location.href = URL.createObjectURL(blob);
      } catch {
        win?.close();
        showToast("Failed to generate shipping labels", "error");
      } finally {
        setPending(null);
      }
    })();
  }

  async function handleExport() {
    setPending("export");
    const csv = await exportOrdersCsvByIds(selectedIds);
    setPending(null);
    downloadCsv(csv, "trendymall-orders-export.csv");
  }

  const canBulkCancel = tab === "new" || tab === "packaging" || tab === "ready_to_ship" || tab === "all";
  const buttonClass =
    "transition-brand rounded-full border border-white/30 px-3 py-1.5 text-sm font-medium hover:bg-white/10 disabled:opacity-50";

  return (
    <>
      <div className="sticky bottom-4 z-[var(--z-drawer-overlay)] mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-[var(--foreground)] px-4 py-3 text-white shadow-[var(--shadow-card-hover)]">
        <span className="text-sm font-medium">{selectedIds.length} selected</span>
        <div className="flex flex-wrap items-center gap-2">
          {tab === "new" && (
            <button type="button" onClick={handleConfirm} disabled={pending !== null} className={buttonClass}>
              Confirm Orders
            </button>
          )}
          <button type="button" onClick={handlePrintInvoice} disabled={pending !== null} className={buttonClass}>
            Print Invoice
          </button>
          {(tab === "packaging" || tab === "ready_to_ship" || tab === "out_for_delivery") && (
            <button
              type="button"
              onClick={handlePrintShippingLabels}
              disabled={pending !== null}
              className={buttonClass}
            >
              Print Shipping Labels
            </button>
          )}
          <button type="button" onClick={handleExport} disabled={pending !== null} className={buttonClass}>
            Export Orders
          </button>
          {canBulkCancel && (
            <button
              type="button"
              onClick={() => setConfirmCancelOpen(true)}
              disabled={pending !== null}
              className={`${buttonClass} border-[var(--color-discount)] text-[var(--color-discount)]`}
            >
              Cancel Orders
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-sm text-white/70 underline hover:text-white"
        >
          Clear selection
        </button>
      </div>

      {confirmCancelOpen && (
        <ConfirmDialog
          title="Cancel Orders?"
          message={`${selectedIds.length} order${selectedIds.length === 1 ? "" : "s"} will be cancelled, stock restored, and customers emailed. This cannot be undone from here.`}
          confirmLabel="Cancel Orders"
          destructive
          pending={pending === "cancel"}
          onConfirm={handleCancel}
          onClose={() => setConfirmCancelOpen(false)}
        />
      )}
    </>
  );
}
