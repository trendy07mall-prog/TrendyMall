import { ComingSoon } from "@/components/admin/ComingSoon";
import { CreditCardIcon } from "@/components/ui/Icon";

export default function AdminPaymentsPage() {
  return (
    <ComingSoon
      icon={CreditCardIcon}
      title="Payments"
      description="The store currently accepts Cash on Delivery only — this page will have something to configure once a payment gateway is integrated."
    />
  );
}
