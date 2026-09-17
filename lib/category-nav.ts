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
  children: CategoryNavNode[];
}

type IconComponent = typeof FolderIcon;

// The categories table has an image_path (the photo the homepage cards use)
// but no icon column, so the header's icons are mapped by slug here instead
// of inventing icon data in the database. Shared by the desktop flyout and
// the mobile accordion -- add a row when a new top-level category is
// created, otherwise it falls back to the generic folder icon.
// Wrapped in an object so callers render it as <icon.Icon /> (a member
// expression, like NAV_LINKS entries in NavbarClient) rather than
// assigning a component to a local during render.
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

export function categoryIcon(slug: string): { Icon: IconComponent } {
  return { Icon: ICONS_BY_SLUG[slug] ?? FolderIcon };
}

// The whole active tree, to whatever depth the data actually has (today:
// four levels, e.g. Health & Beauty > Men's Care > Shaving & Grooming >
// Trimmers). Every category keeps ALL of its direct children, so no
// sibling is dropped at any level. Input order (sort_order, from the
// query) is preserved at every level.
export function buildCategoryNav(categories: Category[]): CategoryNavNode[] {
  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const siblings = childrenByParent.get(category.parent_id) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parent_id, siblings);
  }

  const attach = (category: Category): CategoryNavNode => ({
    ...category,
    children: (childrenByParent.get(category.id) ?? []).map(attach),
  });

  return categories.filter((category) => category.depth === 0).map(attach);
}

// Levels of children below this node: 0 = none, 1 = a flat list (which the
// desktop flyout can lay out as a plain two-column grid), 2+ = needs the
// nested, expandable list instead.
export function categoryTreeDepth(node: CategoryNavNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(categoryTreeDepth));
}
