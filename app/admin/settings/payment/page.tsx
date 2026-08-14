import { createClient } from "@/lib/supabase/server";
import { getPaymentSettings } from "@/lib/data/settings";
import { isPayHereEnabled } from "@/lib/payhere";
import { PaymentSettingsForm } from "@/components/admin/settings/PaymentSettingsForm";
import { BankTransferSettingsForm } from "@/components/admin/BankTransferSettingsForm";

// Provider/environment/merchant ID are read live from process.env and
// displayed read-only -- never written to store_settings, never even
// editable here. This is what makes "no secret is ever stored in this
// settings table" structurally true rather than a policy someone could
// accidentally violate later. PAYHERE_MERCHANT_SECRET itself is never
// read or displayed anywhere in this file.
function maskMerchantId(id: string | undefined): string {
  if (!id) return "Not set";
  if (id.length <= 4) return id;
  return `${"•".repeat(Math.max(0, id.length - 4))}${id.slice(-4)}`;
}

export default async function SettingsPaymentPage() {
  const supabase = await createClient();
  const [payment, { data: bankDetails }] = await Promise.all([
    getPaymentSettings(),
    supabase.from("bank_transfer_settings").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const payHereConfigured = isPayHereEnabled();
  const merchantIdDisplay = maskMerchantId(process.env.PAYHERE_MERCHANT_ID);
  const environment = process.env.PAYHERE_MODE === "live" ? "Live" : "Sandbox / Test";

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-lg font-semibold">Payment Methods</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Turn payment methods on or off at checkout. Online Payment also requires PayHere to be configured
          below — this toggle can never enable it on its own.
        </p>
        <div className="mt-6">
          <PaymentSettingsForm initial={payment} payHereConfigured={payHereConfigured} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-8">
        <h2 className="text-lg font-semibold">Bank Transfer Details</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Shown to customers who choose Bank Transfer at checkout.
        </p>
        <BankTransferSettingsForm settings={bankDetails} />
      </div>

      <div className="border-t border-[var(--border)] pt-8">
        <h2 className="text-lg font-semibold">Online Payment Preparation</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Read-only — configured via environment variables, not editable here. No secret key is ever stored
          in Settings.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-4 rounded-[var(--radius-md)] border border-[var(--border)] p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              Provider
            </dt>
            <dd className="mt-1 text-sm font-medium">PayHere</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              Environment
            </dt>
            <dd className="mt-1 text-sm font-medium">{environment}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
              Merchant ID
            </dt>
            <dd className="mt-1 text-sm font-medium">{merchantIdDisplay}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {payHereConfigured
            ? "PayHere is configured and available (subject to the Online Payment toggle above)."
            : "PAYHERE_MERCHANT_ID/PAYHERE_MERCHANT_SECRET are not set — Online Payment stays unavailable at checkout regardless of the toggle above."}
        </p>
      </div>
    </div>
  );
}
