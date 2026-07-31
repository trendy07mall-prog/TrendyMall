"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, PencilIcon, CopyIcon, TrashIcon, DotsIcon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  duplicateProduct,
  deleteProductInline,
  bulkRestore,
} from "@/lib/admin/products-mutations";
import { useToast } from "@/components/admin/ToastProvider";

export function ProductActionsMenu({
  productId,
  productSlug,
  productName,
  isDeletedView = false,
}: {
  productId: string;
  productSlug: string;
  productName: string;
  isDeletedView?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleRestore() {
    setRestoring(true);
    const result = await bulkRestore([productId]);
    setRestoring(false);
    if (result.errors.length > 0) showToast(result.errors[0], "error");
    else {
      showToast("Product restored");
      router.refresh();
    }
  }

  async function handleDuplicate() {
    setMenuOpen(false);
    const result = await duplicateProduct(productId);
    if ("error" in result) showToast(result.error, "error");
    else {
      showToast(`Duplicated as "${productName} (Copy)"`);
      router.refresh();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProductInline(productId);
    setDeleting(false);
    setConfirmOpen(false);
    if ("error" in result) showToast(result.error, "error");
    else {
      showToast("Product removed — can be restored from the Deleted filter");
      router.refresh();
    }
  }

  const iconButtonClass =
    "transition-brand flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5";

  if (isDeletedView) {
    return (
      <button
        type="button"
        onClick={handleRestore}
        disabled={restoring}
        className="transition-brand rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-50"
      >
        {restoring ? "Restoring…" : "Restore"}
      </button>
    );
  }

  return (
    <>
      <div className="hidden items-center gap-1 lg:flex">
        <Link
          href={`/product/${productSlug}`}
          target="_blank"
          aria-label="View product"
          title="View"
          className={iconButtonClass}
        >
          <EyeIcon className="h-4 w-4" />
        </Link>
        <Link
          href={`/admin/products/${productId}/edit`}
          aria-label="Edit product"
          title="Edit"
          className={iconButtonClass}
        >
          <PencilIcon className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={handleDuplicate}
          aria-label="Duplicate product"
          title="Duplicate"
          className={iconButtonClass}
        >
          <CopyIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label="Delete product"
          title="Delete"
          className={`${iconButtonClass} text-[var(--color-discount)]`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <div ref={menuRef} className="relative lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          className={iconButtonClass}
        >
          <DotsIcon className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute top-full right-0 z-10 mt-1 min-w-36 rounded-[var(--radius-md)] border border-[var(--border)] bg-white py-1 shadow-[var(--shadow-card-hover)]">
            <Link
              href={`/product/${productSlug}`}
              target="_blank"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-black/5"
            >
              View
            </Link>
            <Link
              href={`/admin/products/${productId}/edit`}
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-black/5"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={handleDuplicate}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-[var(--color-discount)] hover:bg-black/5"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Delete Product?"
          message={`"${productName}" will be removed from the store and can be restored later from the Deleted filter.`}
          confirmLabel="Delete"
          destructive
          pending={deleting}
          onConfirm={handleDelete}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
