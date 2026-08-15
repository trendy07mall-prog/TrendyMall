import { CashIcon, CreditCardIcon, ChartBarIcon, CartIcon } from "@/components/ui/Icon";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { SalesOverviewChart } from "@/components/admin/finance/SalesOverviewChart";
import { RevenueBreakdownCard } from "@/components/admin/finance/RevenueBreakdownCard";
import { PaymentOverviewCards } from "@/components/admin/finance/PaymentOverviewCards";
import { getFinanceOverview, resolveFinanceRangeWindow } from "@/lib/admin/finance-query";
import { parseFinanceRangeState } from "@/lib/admin/finance-filters";
import { getPaymentSettings } from "@/lib/data/settings";
import { formatPrice } from "@/lib/utils";

export default async function AdminFinanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rangeState = parseFinanceRangeState(sp);
  const window = resolveFinanceRangeWindow(rangeState.range, rangeState.customFrom, rangeState.customTo);

  const [overview, paymentSettings] = await Promise.all([getFinanceOverview(window), getPaymentSettings()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={ChartBarIcon} label="Total Sales" value={formatPrice(overview.kpis.totalSales)} accent="navy" />
        <KpiCard
          icon={CashIcon}
          label="Money Received"
          value={formatPrice(overview.kpis.moneyReceived)}
          accent="emerald"
        />
        <KpiCard
          icon={CreditCardIcon}
          label="Pending Payments"
          value={formatPrice(overview.kpis.pendingPayments)}
          accent="orange"
        />
        <KpiCard icon={CartIcon} label="Orders" value={overview.kpis.ordersCount} accent="blue" />
      </div>

      <SalesOverviewChart series={overview.salesSeries} bucket={overview.bucket} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueBreakdownCard breakdown={overview.revenueBreakdown} />
        <PaymentOverviewCards
          stats={overview.paymentMethods}
          onlinePaymentEnabled={paymentSettings.onlinePaymentEnabled}
        />
      </div>
    </div>
  );
}
