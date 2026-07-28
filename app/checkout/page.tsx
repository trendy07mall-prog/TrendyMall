import { getBankTransferSettings } from "@/lib/bankTransferSettings";
import { isPayHereEnabled } from "@/lib/payhere";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage() {
  const bankDetails = await getBankTransferSettings();
  return <CheckoutForm bankDetails={bankDetails} payHereEnabled={isPayHereEnabled()} />;
}
