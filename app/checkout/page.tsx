import { getBankTransferSettings } from "@/lib/bankTransferSettings";
import { isPayHereEnabled } from "@/lib/payhere";
import { getMyAddresses } from "@/lib/addresses";
import { getMyProfile } from "@/lib/profile";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage() {
  const [bankDetails, addresses, profile] = await Promise.all([
    getBankTransferSettings(),
    getMyAddresses(),
    getMyProfile(),
  ]);
  return (
    <CheckoutForm
      bankDetails={bankDetails}
      payHereEnabled={isPayHereEnabled()}
      addresses={addresses}
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
