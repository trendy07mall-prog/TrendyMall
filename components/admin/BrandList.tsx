"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BrandForm } from "@/components/admin/BrandForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ToastProvider";
import { createBrand, deleteBrand, toggleBrandActive, updateBrand } from "@/lib/admin/brands";
import { AwardIcon } from "@/components/ui/Icon";
import type { Brand } from "@/types";

export function BrandList({
  brands,
  productCountByBrandId,
}: {
  brands: Brand[];
  productCountByBrandId: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Brand | "new" | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleToggleActive(brand: Brand) {
    startTransition(async () => {
      const result = await toggleBrandActive(brand.id, !brand.is_active);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(brand.is_active ? "Brand deactivated" : "Brand activated");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteBrand(deleting.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Brand deleted");
        router.refresh();
      }
      setDeleting(null);
    });
  }

  if (editing !== null) {
    const editingBrand = editing === "new" ? null : editing;
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to brands
        </button>
        <BrandForm
          brand={editingBrand}
          action={editingBrand ? updateBrand.bind(null, editingBrand.id) : createBrand}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Brand
      </button>

      <div className="mt-6 flex flex-col rounded-[var(--radius-card)] border border-[var(--border)] p-2">
        {brands.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">No brands yet.</p>
        ) : (
          brands.map((brand) => (
            <div
              key={brand.id}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-transparent px-2 py-2 hover:bg-black/5"
            >
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
                {brand.image_path ? (
                  <Image src={brand.image_path} alt="" fill sizes="32px" className="object-cover" />
                ) : (
                  <AwardIcon className="h-4 w-4 text-[var(--muted)]" />
                )}
              </span>

              <span className="flex-1 truncate text-sm font-medium">{brand.name}</span>
              <span className="text-xs text-[var(--muted)]">{brand.slug}</span>
              <span className="text-xs text-[var(--muted)]">
                {productCountByBrandId[brand.id] ?? 0} product
                {(productCountByBrandId[brand.id] ?? 0) === 1 ? "" : "s"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs whitespace-nowrap uppercase tracking-wide ${
                  brand.is_active ? "border-current" : "border-current text-[var(--muted)]"
                }`}
              >
                {brand.is_active ? "Active" : "Inactive"}
              </span>

              <div className="flex shrink-0 items-center gap-3">
                <button type="button" onClick={() => setEditing(brand)} className="text-xs underline">
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleToggleActive(brand)}
                  className="text-xs underline disabled:opacity-50"
                >
                  {brand.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(brand)}
                  className="text-xs text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete brand?"
          message={`Are you sure you want to delete "${deleting.name}"? This can't be undone.`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={handleDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
