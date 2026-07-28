"use server";

import { revalidatePath } from "next/cache";
import { requireAdminClient } from "@/lib/admin/guard";

export type BankSettingsFormState = { error: string } | undefined;

// Mirrors lib/admin/banner.ts's saveBanner exactly — same "one settings
// row, update-or-insert by presence of a hidden id" shape.
export async function saveBankTransferSettings(
  _prevState: BankSettingsFormState,
  formData: FormData,
): Promise<BankSettingsFormState> {
  const supabase = await requireAdminClient();

  const id = String(formData.get("id") ?? "").trim() || null;
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim() || null;

  if (!bankName || !accountName || !accountNumber || !branch) {
    return { error: "Bank name, account name, account number, and branch are required." };
  }

  const row = {
    bank_name: bankName,
    account_name: accountName,
    account_number: accountNumber,
    branch,
    instructions,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("bank_transfer_settings").update(row).eq("id", id)
    : await supabase.from("bank_transfer_settings").insert(row);

  if (error) return { error: error.message };

  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
  return undefined;
}
