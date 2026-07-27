import { ComingSoon } from "@/components/admin/ComingSoon";
import { FolderIcon } from "@/components/ui/Icon";

export default function AdminCategoriesPage() {
  return (
    <ComingSoon
      icon={FolderIcon}
      title="Categories"
      description="A dedicated page to manage categories directly — for now, add a new category from the product form's category field."
    />
  );
}
