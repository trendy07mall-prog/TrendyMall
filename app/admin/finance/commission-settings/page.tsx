import { CommissionSettingsForm } from "@/components/admin/finance/CommissionSettingsForm";
import { CommissionCategoryRules } from "@/components/admin/finance/CommissionCategoryRules";
import { getCommissionSettings } from "@/lib/data/settings";
import { getCommissionRulesPageData } from "@/lib/admin/commission-rules-query";

export default async function AdminFinanceCommissionSettingsPage() {
  const [settings, { rules, categories }] = await Promise.all([
    getCommissionSettings(),
    getCommissionRulesPageData(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 px-4 py-3 text-sm text-[var(--color-warning)]">
        Future marketplace groundwork — this system is off by default and does not affect current
        orders, checkout, or pricing in any way.
      </div>
      <CommissionSettingsForm initial={settings} />
      <CommissionCategoryRules rules={rules} categories={categories} />
    </div>
  );
}
