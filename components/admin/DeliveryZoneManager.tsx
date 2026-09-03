"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DeliveryZoneForm } from "@/components/admin/DeliveryZoneForm";
import {
  toggleDeliveryZoneStatus,
  reorderDeliveryZones,
  deleteDeliveryZone,
} from "@/lib/admin/delivery-zones";
import { useToast } from "@/components/admin/ToastProvider";
import { BanIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon } from "@/components/ui/Icon";
import { ActionButton } from "@/components/ui/ActionButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AdminDeliveryZone } from "@/lib/admin/delivery-zones-query";

type EditingState = { mode: "new" } | { mode: "edit"; data: AdminDeliveryZone } | null;

// Modeled on HeroSlideManager.tsx.
export function DeliveryZoneManager({ zones }: { zones: AdminDeliveryZone[] }) {
  const [editing, setEditing] = useState<EditingState>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  function handleQuickToggle(zone: AdminDeliveryZone, next: "active" | "inactive") {
    startTransition(async () => {
      const result = await toggleDeliveryZoneStatus(zone.id, next);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(next === "active" ? "Zone activated" : "Zone deactivated");
        router.refresh();
      }
    });
  }

  function handleMove(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= zones.length) return;
    const reordered = [...zones];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    startTransition(async () => {
      const result = await reorderDeliveryZones(reordered.map((z) => z.id));
      if (result.error) showToast(result.error, "error");
      else router.refresh();
    });
  }

  function handleDelete(zone: AdminDeliveryZone) {
    if (!window.confirm(`Delete the "${zone.name}" zone? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteDeliveryZone(zone.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Zone deleted");
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
          ← Back to delivery zones
        </button>
        <DeliveryZoneForm
          initial={editing.mode === "edit" ? editing.data : null}
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
        onClick={() => setEditing({ mode: "new" })}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Zone
      </button>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Zone</th>
              <th className="py-2 pr-4">Postal range</th>
              <th className="py-2 pr-4">District</th>
              <th className="py-2 pr-4">Rate</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Order</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone, index) => (
              <tr key={zone.id} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4 font-medium">
                  {zone.name}
                  {zone.is_default && (
                    <StatusBadge tone="neutral" uppercase={false} className="ml-2">
                      Default
                    </StatusBadge>
                  )}
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">
                  {zone.postal_code_start && zone.postal_code_end
                    ? `${zone.postal_code_start}–${zone.postal_code_end}`
                    : "Any"}
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">{zone.district_match ?? "Any"}</td>
                <td className="py-2 pr-4">Rs. {zone.rate}</td>
                <td className="py-2 pr-4">
                  <StatusBadge tone={zone.status === "active" ? "success" : "neutral"}>
                    {zone.status === "active" ? "Active" : "Inactive"}
                  </StatusBadge>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1">
                    <ActionButton
                      icon={ChevronUpIcon}
                      label="Move up"
                      iconOnly
                      disabled={pending || index === 0}
                      onClick={() => handleMove(index, -1)}
                    />
                    <ActionButton
                      icon={ChevronDownIcon}
                      label="Move down"
                      iconOnly
                      disabled={pending || index === zones.length - 1}
                      onClick={() => handleMove(index, 1)}
                    />
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <ActionButton
                      icon={PencilIcon}
                      label="Edit"
                      onClick={() => setEditing({ mode: "edit", data: zone })}
                    />
                    {zone.status === "active" ? (
                      <ActionButton
                        icon={BanIcon}
                        label="Disable"
                        tone="warning"
                        disabled={pending}
                        onClick={() => handleQuickToggle(zone, "inactive")}
                      />
                    ) : (
                      <ActionButton
                        icon={CheckIcon}
                        label="Enable"
                        tone="success"
                        disabled={pending}
                        onClick={() => handleQuickToggle(zone, "active")}
                      />
                    )}
                    <ActionButton
                      icon={TrashIcon}
                      label="Delete"
                      tone="danger"
                      disabled={pending}
                      onClick={() => handleDelete(zone)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No delivery zones configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
