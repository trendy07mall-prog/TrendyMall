import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryNav, categoryIcon, categoryTreeDepth } from "./category-nav";
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

// Mirrors the real shape of the live data: a four-level chain, and a branch
// whose middle level has three siblings.
const health = category({ id: "1", slug: "health-beauty", depth: 0 });
const mensCare = category({ id: "2", slug: "men-s-care", depth: 1, parent_id: "1" });
const shaving = category({ id: "3", slug: "shaving-grooming", depth: 2, parent_id: "2" });
const trimmers = category({ id: "4", slug: "trimmers-groomers-clippers", depth: 3, parent_id: "3" });
const electronic = category({ id: "5", slug: "electronic", depth: 0 });
const speakers = category({ id: "6", slug: "speakers", depth: 1, parent_id: "5" });
const earphones = category({ id: "7", slug: "earphones", depth: 1, parent_id: "5" });
const neckband = category({ id: "8", slug: "neck-band", depth: 2, parent_id: "7" });
const headsets = category({ id: "9", slug: "headsets", depth: 2, parent_id: "7" });
const earbuds = category({ id: "10", slug: "earbuds", depth: 2, parent_id: "7" });
const flat = category({ id: "11", slug: "watches-sunglasses-jewellery", depth: 0 });
const watches = category({ id: "12", slug: "watches", depth: 1, parent_id: "11" });

const ALL = [health, mensCare, shaving, trimmers, electronic, speakers, earphones, neckband, headsets, earbuds, flat, watches];

describe("buildCategoryNav", () => {
  test("nests to the real depth of the data, not just two levels", () => {
    const [healthNode] = buildCategoryNav(ALL);
    const chain = [healthNode.slug, healthNode.children[0].slug, healthNode.children[0].children[0].slug, healthNode.children[0].children[0].children[0].slug];
    assert.deepEqual(chain, ["health-beauty", "men-s-care", "shaving-grooming", "trimmers-groomers-clippers"]);
  });

  test("keeps every sibling at every level", () => {
    const electronicNode = buildCategoryNav(ALL).find((n) => n.slug === "electronic")!;
    assert.deepEqual(electronicNode.children.map((c) => c.slug), ["speakers", "earphones"]);
    const earphonesNode = electronicNode.children.find((c) => c.slug === "earphones")!;
    assert.deepEqual(earphonesNode.children.map((c) => c.slug), ["neck-band", "headsets", "earbuds"]);
  });

  test("a leaf category has no children at any depth", () => {
    const [healthNode] = buildCategoryNav(ALL);
    assert.deepEqual(healthNode.children[0].children[0].children[0].children, []);
  });

  test("no categories at all is an empty menu, not an error", () => {
    assert.deepEqual(buildCategoryNav([]), []);
  });
});

describe("categoryTreeDepth", () => {
  test("reports 0 for a leaf, 1 for a flat list, and the real depth for a chain", () => {
    const nav = buildCategoryNav(ALL);
    const byslug = (slug: string) => nav.find((n) => n.slug === slug)!;
    assert.equal(categoryTreeDepth(byslug("watches-sunglasses-jewellery")), 1);
    assert.equal(categoryTreeDepth(byslug("watches-sunglasses-jewellery").children[0]), 0);
    assert.equal(categoryTreeDepth(byslug("health-beauty")), 3);
    assert.equal(categoryTreeDepth(byslug("electronic")), 2);
  });
});

describe("categoryIcon", () => {
  test("maps a known slug to its own icon", () => {
    assert.notEqual(categoryIcon("electronic").Icon, categoryIcon("health-beauty").Icon);
  });

  test("deeper, unmapped categories fall back to one shared generic icon", () => {
    assert.equal(categoryIcon("shaving-grooming").Icon, categoryIcon("trimmers-groomers-clippers").Icon);
    assert.equal(typeof categoryIcon("brand-new-category-2027").Icon, "function");
  });
});
