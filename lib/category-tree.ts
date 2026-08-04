import type { Category } from "@/types";

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

// Groups a flat category list by parent_id into a real tree, each level
// sorted by sort_order -- the simple flat `.order("sort_order")` fetch
// doesn't produce a usable hierarchical order on its own (sort_order only
// means anything among siblings), so the nesting + depth-first ordering
// happens here in JS rather than a recursive SQL query.
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const byParent = new Map<string | null, Category[]>();
  for (const category of categories) {
    const key = category.parent_id;
    const siblings = byParent.get(key) ?? [];
    siblings.push(category);
    byParent.set(key, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.sort_order - b.sort_order);
  }

  function attachChildren(category: Category): CategoryTreeNode {
    const children = (byParent.get(category.id) ?? []).map(attachChildren);
    return { ...category, children };
  }

  return (byParent.get(null) ?? []).map(attachChildren);
}

// Depth-first flatten of a tree back into a flat list, in correct display
// order (parent immediately followed by its own children) -- used for
// indented <option> lists and any other place that wants "the whole tree,
// in order" without rendering nested DOM.
export function flattenCategoryTree(nodes: CategoryTreeNode[]): Category[] {
  const result: Category[] = [];
  function visit(node: CategoryTreeNode) {
    const { children, ...category } = node;
    result.push(category);
    children.forEach(visit);
  }
  nodes.forEach(visit);
  return result;
}
