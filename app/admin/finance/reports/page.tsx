import { ComingSoon } from "@/components/admin/ComingSoon";
import { ListIcon } from "@/components/ui/Icon";

export default function AdminFinanceReportsPage() {
  return (
    <ComingSoon
      icon={ListIcon}
      title="Reports"
      description="Saved/scheduled reporting beyond the Overview and Orders exports — not scoped yet."
    />
  );
}
