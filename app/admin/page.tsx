import { createClient } from "@/lib/supabase/server";
import { getDashboardData, type DashboardRange } from "@/lib/admin/dashboard-query";
import { formatPrice } from "@/lib/utils";
import { CashIcon, CartIcon, UserIcon, CreditCardIcon } from "@/components/ui/Icon";
import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { SalesChart } from "@/components/admin/dashboard/SalesChart";
import { RangeTabs } from "@/components/admin/dashboard/RangeTabs";
import { RunningCampaignsSection } from "@/components/admin/dashboard/RunningCampaignsSection";
import { OrdersOverviewSection } from "@/components/admin/dashboard/OrdersOverviewSection";
import { FinanceSection } from "@/components/admin/dashboard/FinanceSection";
import { RecentActivitySection } from "@/components/admin/dashboard/RecentActivitySection";
import { BestSellersSection } from "@/components/admin/dashboard/BestSellersSection";
import { InventoryAlertsSection } from "@/components/admin/dashboard/InventoryAlertsSection";
import { QuickActionsSection } from "@/components/admin/dashboard/QuickActionsSection";

const VALID_RANGES: DashboardRange[] = ["today", "7d", "month", "custom"];
const VALID_CHART_DAYS = [7, 30, 90] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold text-[#0F2D52]">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asString = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const rangeParam = asString(sp.range);
  const range: DashboardRange = VALID_RANGES.includes(rangeParam as DashboardRange)
    ? (rangeParam as DashboardRange)
    : "today";

  const chartRangeParam = Number(asString(sp.chartRange));
  const chartRangeDays = (VALID_CHART_DAYS as readonly number[]).includes(chartRangeParam)
    ? (chartRangeParam as 7 | 30 | 90)
    : 7;

  const customFrom = asString(sp.customFrom);
  const customTo = asString(sp.customTo);

  const currentParams: Record<string, string | undefined> = {
    range: asString(sp.range),
    chartRange: asString(sp.chartRange),
  };

  const supabase = await createClient();
  const [{ data: { user } }, data] = await Promise.all([
    supabase.auth.getUser(),
    getDashboardData(range, chartRangeDays, customFrom, customTo),
  ]);

  let adminName = "Admin";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    adminName = profile?.full_name || user.email?.split("@")[0] || "Admin";
  }

  return (
    <div className="flex min-w-0 flex-col gap-10 pb-10">
      <DashboardHeader
        adminName={adminName}
        newOrdersCount={data.newOrdersCount}
        range={range}
        currentParams={currentParams}
        customFrom={customFrom}
        customTo={customTo}
      />

      <Section title={`${data.rangeLabel} Overview`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={CashIcon}
            label={`${data.rangeLabel} Sales`}
            value={formatPrice(data.periodSales)}
            trendPercent={data.periodSalesChangePercent}
            accent="navy"
          />
          <KpiCard icon={CartIcon} label={`${data.rangeLabel} Orders`} value={data.periodOrdersCount} accent="blue" />
          <KpiCard icon={UserIcon} label="New Customers" value={data.newCustomersCount} accent="emerald" />
          <KpiCard
            icon={CreditCardIcon}
            label="Pending Payments"
            value={formatPrice(data.pendingPaymentsTotal)}
            href="/admin/orders?paymentStatus=pending"
            accent="orange"
          />
        </div>
      </Section>

      <Section title="Sales Overview">
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
          <div className="flex justify-end">
            <RangeTabs
              options={[
                { value: "7", label: "7 Days" },
                { value: "30", label: "30 Days" },
                { value: "90", label: "90 Days" },
              ]}
              activeValue={String(chartRangeDays)}
              paramName="chartRange"
              currentParams={currentParams}
            />
          </div>
          <div className="mt-4">
            <SalesChart data={data.salesSeries} />
          </div>
        </div>
      </Section>

      <Section title="Running Campaigns">
        <RunningCampaignsSection campaigns={data.runningCampaigns} />
      </Section>

      <Section title="Orders Overview">
        <OrdersOverviewSection statusCounts={data.orderStatusCounts} recentOrders={data.recentOrders} />
      </Section>

      <Section title="Finance">
        <FinanceSection
          revenue={data.revenue}
          paidTotal={data.paidTotal}
          pendingTotal={data.pendingPaymentsTotal}
          refundsTotal={data.refundsTotal}
          gross={data.gross}
          discounts={data.discounts}
          delivery={data.delivery}
          net={data.net}
        />
      </Section>

      <Section title="Recent Activity">
        <RecentActivitySection reviews={data.recentReviews} subscribers={data.newSubscribers} />
      </Section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Section title="Best Sellers">
          <BestSellersSection bestSellers={data.bestSellers} />
        </Section>
        <Section title={`Inventory Alerts (${data.lowStockProducts.length})`}>
          <InventoryAlertsSection lowStock={data.lowStockProducts} />
        </Section>
      </div>

      <Section title="Quick Actions">
        <QuickActionsSection />
      </Section>
    </div>
  );
}
