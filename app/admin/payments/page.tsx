import { createClient } from "@/lib/supabase/server";
import { BankTransferSettingsForm } from "@/components/admin/BankTransferSettingsForm";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("bank_transfer_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Payments</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Bank details shown to customers who choose Bank Transfer at checkout. Cash on
        Delivery needs no configuration.
      </p>
      <BankTransferSettingsForm settings={settings} />
    </div>
  );
}
