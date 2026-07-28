import { createClient } from "@/lib/supabase/server";
import type { BankTransferSettings } from "@/types";

export async function getBankTransferSettings(): Promise<BankTransferSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bank_transfer_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
