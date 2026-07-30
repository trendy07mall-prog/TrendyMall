"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AddressForm } from "@/components/account/AddressForm";
import { deleteAddress, setDefaultAddress } from "@/lib/addresses";
import { useToast } from "@/components/ui/ToastProvider";
import type { CustomerAddress } from "@/types";

export function AddressesManager({ addresses }: { addresses: CustomerAddress[] }) {
  const [editing, setEditing] = useState<CustomerAddress | null | "new">(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleSetDefault(address: CustomerAddress) {
    startTransition(async () => {
      const result = await setDefaultAddress(address.id);
      if (result.error) showToast(result.error, { variant: "error" });
      else {
        showToast(`${address.address_label || "Address"} set as default`);
        router.refresh();
      }
    });
  }

  function handleDelete(address: CustomerAddress) {
    if (!window.confirm("Remove this address?")) return;
    startTransition(async () => {
      const result = await deleteAddress(address.id);
      if (result.error) showToast(result.error, { variant: "error" });
      else {
        showToast("Address removed");
        router.refresh();
      }
    });
  }

  if (editing !== null) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mb-4 text-sm text-[var(--muted)] underline"
        >
          ← Back to addresses
        </button>
        <AddressForm
          address={editing === "new" ? null : editing}
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
        + Add New Address
      </button>

      <ul className="mt-6 flex flex-col gap-4">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {address.address_label || "Address"}
                  {address.is_default && (
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase">
                      Default
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  {address.first_name} {address.last_name} — {address.phone}
                </p>
                <p className="text-[var(--muted)]">
                  {address.street}, {address.city}, {address.district}
                  {address.postal_code ? ` ${address.postal_code}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setEditing(address)}
                className="text-sm underline"
              >
                Edit
              </button>
              {!address.is_default && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleSetDefault(address)}
                  className="text-sm underline disabled:opacity-50"
                >
                  Set Default
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(address)}
                className="text-sm text-[var(--color-discount)] underline disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {addresses.length === 0 && (
          <li className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
            No saved addresses yet.
          </li>
        )}
      </ul>
    </div>
  );
}
