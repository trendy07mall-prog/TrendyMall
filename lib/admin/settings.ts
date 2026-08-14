"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";

export type SettingType = "string" | "number" | "boolean" | "json" | "image" | "color";

export interface SettingUpdate {
  key: string;
  value: unknown;
  type: SettingType;
  group_name: string;
  description?: string;
}

export type UpdateSettingsResult = { error: string } | { error?: undefined };

// One generic upsert reused by every settings group's form (General,
// Branding, Contact, Announcement, and every later-phase group) -- a
// group's Save Changes button sends only the keys it owns, so saving one
// group can never clobber another's values. Every write re-checks admin
// status at the DB layer via requireAdminClient(), same guard every other
// admin mutation in this codebase uses.
export async function updateSettings(updates: SettingUpdate[]): Promise<UpdateSettingsResult> {
  if (updates.length === 0) return {};

  const supabase = await requireAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = updates.map((update) => ({
    key: update.key,
    value: update.value as never,
    type: update.type,
    group_name: update.group_name,
    description: update.description,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  }));

  const { error } = await supabase.from("store_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };

  // Settings affect nearly every storefront route (hours, WhatsApp,
  // announcement bar, logos) plus the admin Settings UI itself -- layout
  // revalidation covers both without needing a per-page list that would
  // drift as new consumers are added in later phases.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings", "layout");

  return {};
}
