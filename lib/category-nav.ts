import {
  BoltIcon,
  DashboardIcon,
  DownloadIcon,
  FolderIcon,
  GearIcon,
  GemIcon,
  HeartIcon,
  PackageIcon,
  PhoneIcon,
} from "@/components/ui/Icon";
import type { Category } from "@/types";

export interface CategoryNavNode extends Category {
  children: Category[];
}

type IconComponent = typeof FolderIcon;

// The categories table has an image_path (the photo the homepage cards use)
// but no icon column, so the header's icons are mapped by slug here instead
// of inventing icon data in the database. Shared by the desktop flyout and
// the mobile accordion -- add a row when a new top-level category is
// created, otherwise it falls back to the generic folder icon.
const ICONS_BY_SLUG: Record<string, IconComponent> = {
  "tools-diy-outdoor": GearIcon,
  "health-beauty": HeartIcon,
  "mobile-accessories": PackageIcon,
  "digital-goods": DownloadIcon,
  "computers-laptops": DashboardIcon,
  "mobiles-tablets": PhoneIcon,
  "watches-sunglasses-jewellery": GemIcon,
  electronic: BoltIcon,
};

export function categoryIcon(slug: string): IconComponent {
  return ICONS_BY_SLUG[slug] ?? FolderIcon;
}

// Top-level categories, each with its own direct children (depth 1). Deeper
// levels exist in the data and keep working on the category pages
// themselves -- the header only ever shows two levels, so they are not
// flattened in here. Input order (sort_order, from the query) is preserved.
export function buildCategoryNav(categories: Category[]): CategoryNavNode[] {
  const tops = categories.filter((category) => category.depth === 0);
  return tops.map((top) => ({
    ...top,
    children: categories.filter((category) => category.parent_id === top.id),
  }));
}
