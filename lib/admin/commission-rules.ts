"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";

export type CommissionRuleFormState = { error: string } | { success: true } | undefined;

function revalidateCommissionPaths() {
  revalidatePath("/admin/finance/commission-settings");
}

function readRuleFields(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "");
  const percentRaw = String(formData.get("commissionPercent") ?? "");
  const commissionPercent = Number(percentRaw);
  return { categoryId, percentRaw, commissionPercent };
}

function validateRuleFields(fields: ReturnType<typeof readRuleFields>): string | null {
  if (!fields.categoryId) return "Select a category.";
  if (!fields.percentRaw || Number.isNaN(fields.commissionPercent) || fields.commissionPercent < 0 || fields.commissionPercent > 100) {
    return "Enter a percentage between 0 and 100.";
  }
  return null;
}

// Purely a rules table for a system that stays OFF (commission.enabled
// defaults false, see sql/072_commission_settings.sql) -- creating,
// editing, or deleting a rule here has no effect on any order, checkout
// flow, or price anywhere in the app today.
export async function createCommissionRule(
  _prevState: CommissionRuleFormState,
  formData: FormData,
): Promise<CommissionRuleFormState> {
  const supabase = await requireAdminClient();
  const fields = readRuleFields(formData);
  const validationError = validateRuleFields(fields);
  if (validationError) return { error: validationError };

  const { error } = await supabase.from("commission_category_rules").insert({
    category_id: fields.categoryId,
    commission_percent: fields.commissionPercent,
  });

  if (error) {
    if (error.code === "23505") return { error: "This category already has a commission rule." };
    return { error: error.message };
  }

  revalidateCommissionPaths();
  return { success: true };
}

export async function updateCommissionRule(
  ruleId: string,
  _prevState: CommissionRuleFormState,
  formData: FormData,
): Promise<CommissionRuleFormState> {
  const supabase = await requireAdminClient();
  const fields = readRuleFields(formData);
  const validationError = validateRuleFields(fields);
  if (validationError) return { error: validationError };

  const { error } = await supabase
    .from("commission_category_rules")
    .update({ category_id: fields.categoryId, commission_percent: fields.commissionPercent })
    .eq("id", ruleId);

  if (error) {
    if (error.code === "23505") return { error: "This category already has a commission rule." };
    return { error: error.message };
  }

  revalidateCommissionPaths();
  return { success: true };
}

export async function deleteCommissionRule(ruleId: string): Promise<{ error?: string }> {
  const supabase = await requireAdminClient();
  const { error } = await supabase.from("commission_category_rules").delete().eq("id", ruleId);
  if (error) return { error: error.message };

  revalidateCommissionPaths();
  return {};
}
