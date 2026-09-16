import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryNav, categoryIcon } from "./category-nav";
import type { Category } from "@/types";

const category = (over: Partial<Category> & { id: string; slug: string; depth: number }): Category =>
  ({
    name: over.slug,
    description: null,
    image_path: null,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    parent_id: null,
    path: over.id,
    is_active: true,
    spec_template_id: null,
    ...over,
  }) as Category;

const tools = category({ id: "1", slug: "tools-diy-outdoor", depth: 0 });
const handTools = category({ id: "2", slug: "hand-tools", depth: 1, parent_id: "1" });
const toolsSet = category({ id: "3", slug: "tools-set", depth: 2, parent_id: "2" });
const digital = category({ id: "4", slug: "digital-goods", depth: 0 });

describe("buildCategoryNav", () => {
  test("gives each top-level category its own direct children, in input order", () => {
    const nav = buildCategoryNav([tools, handTools, toolsSet, digital]);
    assert.deepEqual(
      nav.map((n) => [n.slug, n.children.map((c) => c.slug)]),
      [
        ["tools-diy-outdoor", ["hand-tools"]],
        ["digital-goods", []],
      ],
    );
  });

  test("deeper levels are not flattened into the two-level menu", () => {
    const nav = buildCategoryNav([tools, handTools, toolsSet]);
    assert.equal(nav[0].children.some((c) => c.slug === "tools-set"), false);
  });

  test("no categories at all is an empty menu, not an error", () => {
    assert.deepEqual(buildCategoryNav([]), []);
  });
});

describe("categoryIcon", () => {
  test("maps a known slug to its own icon", () => {
    assert.notEqual(categoryIcon("electronic"), categoryIcon("health-beauty"));
  });

  test("an unmapped slug falls back to the generic icon instead of breaking", () => {
    assert.equal(typeof categoryIcon("brand-new-category-2027"), "function");
    assert.equal(categoryIcon("brand-new-category-2027"), categoryIcon("another-unmapped"));
  });
});
