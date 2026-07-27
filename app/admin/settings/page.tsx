import { ComingSoon } from "@/components/admin/ComingSoon";
import { GearIcon } from "@/components/ui/Icon";

export default function AdminSettingsPage() {
  return (
    <ComingSoon
      icon={GearIcon}
      title="Settings"
      description="General store settings — most store info is currently set directly in code rather than a database-backed settings page."
    />
  );
}
