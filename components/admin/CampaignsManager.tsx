"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { toggleCampaignStatus, duplicateCampaign } from "@/lib/admin/campaigns";
import { getCampaignForEdit } from "@/lib/admin/campaigns-query";
import { useToast } from "@/components/admin/ToastProvider";
import { getCampaignRuntimeStatus, RUNTIME_STATUS_LABEL } from "@/lib/campaign-status";
import { BanIcon, CheckIcon, CopyIcon, PencilIcon } from "@/components/ui/Icon";
import { ActionButton } from "@/components/ui/ActionButton";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import type { AdminCampaignRow, CampaignEditData } from "@/lib/admin/campaigns-query";
import type { CampaignStatus } from "@/types";

const PROMO_TYPE_LABELS: Record<string, string> = {
  product_discount: "Product discount",
  flash_sale: "Flash sale",
  free_shipping: "Free shipping",
  coupon: "Coupon",
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  published: "Published",
  draft: "Draft",
  disabled: "Disabled",
};

// draft = warning (not live yet, same "pending" meaning as elsewhere) --
// disabled is a deliberate off state, closer to Inactive's neutral gray
// than a warning.
const STATUS_TONES: Record<CampaignStatus, StatusTone> = {
  published: "success",
  draft: "warning",
  disabled: "neutral",
};

type EditingState = { mode: "new" } | { mode: "edit"; data: CampaignEditData } | null;

export function CampaignsManager({ campaigns }: { campaigns: AdminCampaignRow[] }) {
  const [editing, setEditing] = useState<EditingState>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  async function openEdit(campaign: AdminCampaignRow) {
    setLoadingId(campaign.id);
    try {
      const data = await getCampaignForEdit(campaign.id);
      if (!data) {
        showToast("Could not load this campaign — it may have been removed.", "error");
        return;
      }
      setEditing({ mode: "edit", data });
    } finally {
      setLoadingId(null);
    }
  }

  function handleQuickToggle(campaign: AdminCampaignRow, next: "published" | "disabled") {
    startTransition(async () => {
      const result = await toggleCampaignStatus(campaign.id, next);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(next === "published" ? "Campaign published" : "Campaign disabled");
        router.refresh();
      }
    });
  }

  function handleDuplicate(campaign: AdminCampaignRow) {
    startTransition(async () => {
      const result = await duplicateCampaign(campaign.id);
      if (result.error) showToast(result.error, "error");
      else {
        showToast("Campaign duplicated as a new draft");
        router.refresh();
      }
    });
  }

  if (editing !== null) {
    return (
      <CampaignForm
        initial={editing.mode === "edit" ? editing.data : null}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing({ mode: "new" })}
        className="transition-brand rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        + New Campaign
      </button>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Start</th>
              <th className="py-2 pr-4">End</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const runtime = getCampaignRuntimeStatus(campaign);
              const diverges = campaign.status === "published" && runtime !== "active";
              return (
                <tr key={campaign.id} className="border-b border-[var(--border)]">
                  <td className="py-2 pr-4 font-medium">{campaign.name}</td>
                  <td className="py-2 pr-4">
                    {PROMO_TYPE_LABELS[campaign.promotion_type] ?? campaign.promotion_type}
                  </td>
                  <td className="py-2 pr-4 text-[var(--muted)]">
                    {new Date(campaign.start_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-[var(--muted)]">
                    {campaign.end_at ? new Date(campaign.end_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-4">{campaign.itemCount}</td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col gap-1">
                      <StatusBadge tone={STATUS_TONES[campaign.status]}>{STATUS_LABELS[campaign.status]}</StatusBadge>
                      {diverges && (
                        <span className="text-xs text-[var(--color-warning)]">
                          {RUNTIME_STATUS_LABEL[runtime]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <ActionButton
                        icon={PencilIcon}
                        label={loadingId === campaign.id ? "Loading…" : "Edit"}
                        disabled={loadingId === campaign.id}
                        onClick={() => openEdit(campaign)}
                      />
                      {campaign.status === "published" ? (
                        <ActionButton
                          icon={BanIcon}
                          label="Disable"
                          tone="warning"
                          disabled={pending}
                          onClick={() => handleQuickToggle(campaign, "disabled")}
                        />
                      ) : (
                        <ActionButton
                          icon={CheckIcon}
                          label="Publish"
                          tone="success"
                          disabled={pending}
                          onClick={() => handleQuickToggle(campaign, "published")}
                        />
                      )}
                      <ActionButton
                        icon={CopyIcon}
                        label="Duplicate"
                        disabled={pending}
                        onClick={() => handleDuplicate(campaign)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                  No campaigns yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
