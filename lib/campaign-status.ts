import type { Campaign } from "@/types";

export type CampaignRuntimeStatus = "draft" | "scheduled" | "active" | "ended" | "disabled";

// Admin lifecycle (campaign.status) is never trusted alone for what's
// "actually happening" -- a published campaign whose start_at hasn't
// arrived yet, or whose end_at has passed, must still read as
// Scheduled/Ended, not Active. Pure + import-free so both server-side list
// queries and CampaignForm's live client-side preview badge can call it.
export function getCampaignRuntimeStatus(
  campaign: Pick<Campaign, "status" | "start_at" | "end_at">,
  now: Date = new Date(),
): CampaignRuntimeStatus {
  if (campaign.status === "draft") return "draft";
  if (campaign.status === "disabled") return "disabled";

  const t = now.getTime();
  const start = new Date(campaign.start_at).getTime();
  const end = campaign.end_at ? new Date(campaign.end_at).getTime() : null;

  if (t < start) return "scheduled";
  if (end != null && t >= end) return "ended";
  return "active";
}

export const RUNTIME_STATUS_LABEL: Record<CampaignRuntimeStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  ended: "Ended",
  disabled: "Disabled",
};
