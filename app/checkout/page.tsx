import { getBankTransferSettings } from "@/lib/bankTransferSettings";
import { isPayHereEnabled } from "@/lib/payhere";
import { getMyAddresses } from "@/lib/addresses";
import { getMyProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

// Deliberately not auth-gated (proxy.ts) — guest checkout, v12 Phase 4.
// getMyAddresses()/getMyProfile() already return empty/null for a guest.
export default async function CheckoutPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    bankDetails,
    addresses,
    profile,
  ] = await Promise.all([supabase.auth.getUser(), getBankTransferSettings(), getMyAddresses(), getMyProfile()]);

  return (
    <CheckoutForm
      bankDetails={bankDetails}
      payHereEnabled={isPayHereEnabled()}
      addresses={addresses}
      isLoggedIn={Boolean(user)}
      preferredPaymentMethod={
        profile?.preferred_payment_method === "cod" ||
        profile?.preferred_payment_method === "bank_transfer" ||
        profile?.preferred_payment_method === "payhere"
          ? profile.preferred_payment_method
          : null
      }
    />
  );
}
