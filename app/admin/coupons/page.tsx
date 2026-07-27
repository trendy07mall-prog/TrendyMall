import { ComingSoon } from "@/components/admin/ComingSoon";
import { PercentIcon } from "@/components/ui/Icon";

export default function AdminCouponsPage() {
  return (
    <ComingSoon
      icon={PercentIcon}
      title="Coupons"
      description="Discount codes aren't built yet — sale pricing today is set per-product via the special price field."
    />
  );
}
