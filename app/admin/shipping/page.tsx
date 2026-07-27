import { ComingSoon } from "@/components/admin/ComingSoon";
import { TruckIcon } from "@/components/ui/Icon";

export default function AdminShippingPage() {
  return (
    <ComingSoon
      icon={TruckIcon}
      title="Shipping"
      description="Delivery rates are currently set directly in the checkout flow — a dedicated settings page isn't built yet."
    />
  );
}
