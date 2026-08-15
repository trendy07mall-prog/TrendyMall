import { createClient } from "@/lib/supabase/server";

export interface CommissionRuleRow {
  id: string;
  categoryId: string;
  categoryName: string;
  commissionPercent: number;
}

export interface CategoryOption {
  id: string;
  name: string;
}

// Plain createClient, not requireAdminClient -- only ever called from
// app/admin/finance/commission-settings/page.tsx, which already sits
// behind app/admin/layout.tsx's admin guard, same convention every other
// admin *page* data fetcher in this codebase follows.
export async function getCommissionRulesPageData(): Promise<{
  rules: CommissionRuleRow[];
  categories: CategoryOption[];
}> {
  const supabase = await createClient();

  const [{ data: rules }, { data: categories }] = await Promise.all([
    supabase
      .from("commission_category_rules")
      .select("id, category_id, commission_percent, categories(name)")
      .order("created_at", { ascending: true }),
    supabase.from("categories").select("id, name").eq("is_active", true).order("name", { ascending: true }),
  ]);

  // The embedded categories(name) resource isn't represented in the
  // generated Database types for this select shape -- same pragmatic `any`
  // escape hatch used elsewhere in this codebase for identical embedded
  // joins (e.g. lib/admin/orders-query.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ruleRows = (rules ?? []) as any[];

  return {
    rules: ruleRows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.categories?.name ?? "Deleted category",
      commissionPercent: row.commission_percent,
    })),
    categories: categories ?? [],
  };
}
