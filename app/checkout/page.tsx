import { getBankTransferSettings } from "@/lib/bankTransferSettings";
import { isPayHereEnabled } from "@/lib/payhere";
import { getMyAddresses } from "@/lib/addresses";
import { getMyProfile } from "@/lib/profile";
import { getAuthUser } from "@/lib/supabase/server";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { getShippingSettings, getPaymentSettings } from "@/lib/data/settings";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

// Deliberately not auth-gated (proxy.ts) — guest checkout, v12 Phase 4.
// getMyAddresses()/getMyProfile() already return empty/null for a guest.
export default async function CheckoutPage() {
  const [
    {
      data: { user },
    },
    bankDetails,
    addresses,
    profile,
    zones,
    shippingSettings,
    paymentSettings,
  ] = await Promise.all([
    getAuthUser(),
    getBankTransferSettings(),
    getMyAddresses(),
    getMyProfile(),
    getActiveDeliveryZones(),
    getShippingSettings(),
    getPaymentSettings(),
  ]);

  return (
    <CheckoutForm
      bankDetails={bankDetails}
      // The admin's online-payment toggle only ever narrows availability —
      // ANDed with, never replacing, the real env-based isPayHereEnabled()
      // check, so turning this on without merchant credentials configured
      // still correctly leaves card payment unavailable.
      payHereEnabled={isPayHereEnabled() && paymentSettings.onlinePaymentEnabled}
      codEnabled={paymentSettings.codEnabled}
      bankTransferEnabled={paymentSettings.bankTransferEnabled}
      addresses={addresses}
      isLoggedIn={Boolean(user)}
      defaultEmail={user?.email ?? ""}
      zones={zones}
      shippingSettings={shippingSettings}
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
