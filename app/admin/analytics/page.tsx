import { getAnalyticsData, type AnalyticsRangeDays } from "@/lib/admin/analytics-query";
import { ChartBarIcon, UserIcon, CartIcon, PercentIcon } from "@/components/ui/Icon";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { RangeTabs } from "@/components/admin/dashboard/RangeTabs";
import { ConversionFunnelChart } from "@/components/admin/analytics/ConversionFunnelChart";
import { MarketingSourcesCard } from "@/components/admin/analytics/MarketingSourcesCard";

const VALID_RANGE_DAYS: AnalyticsRangeDays[] = [7, 30, 90];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold text-[#0F2D52]">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asString = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const daysParam = Number(asString(sp.days));
  const rangeDays: AnalyticsRangeDays = (VALID_RANGE_DAYS as readonly number[]).includes(daysParam)
    ? (daysParam as AnalyticsRangeDays)
    : 30;

  const data = await getAnalyticsData(rangeDays);
  const currentParams: Record<string, string | undefined> = { days: asString(sp.days) };

  return (
    <div className="flex min-w-0 flex-col gap-10 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F2D52]">Analytics</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Conversion funnel and traffic sources, built from real visitor events.
          </p>
        </div>
        <RangeTabs
          basePath="/admin/analytics"
          options={[
            { value: "7", label: "7 Days" },
            { value: "30", label: "30 Days" },
            { value: "90", label: "90 Days" },
          ]}
          activeValue={String(rangeDays)}
          paramName="days"
          currentParams={currentParams}
        />
      </div>

      {!data.hasEnoughData ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/5">
            <ChartBarIcon className="h-6 w-6 text-[var(--color-text-secondary)]" />
          </div>
          <h2 className="font-heading mt-4 text-xl font-bold tracking-tight">Not enough data</h2>
          <p className="mt-1.5 max-w-sm text-sm text-[var(--muted)]">
            No visitor events recorded in the {data.rangeLabel.toLowerCase()}. Once real storefront traffic
            comes in, the conversion funnel and marketing sources will show up here.
          </p>
        </div>
      ) : (
        <>
          <Section title={`${data.rangeLabel} Overview`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <KpiCard
                icon={UserIcon}
                label="Visitor Sessions"
                value={data.visitorSessions.toLocaleString()}
                accent="blue"
              />
              <KpiCard icon={CartIcon} label="Orders" value={data.ordersCount.toLocaleString()} accent="navy" />
              <KpiCard
                icon={PercentIcon}
                label="Conversion Rate"
                value={
                  data.conversionRatePercent != null ? `${data.conversionRatePercent.toFixed(2)}%` : "—"
                }
                accent="emerald"
              />
            </div>
          </Section>

          <Section title="Conversion Funnel">
            <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 sm:p-6">
              <ConversionFunnelChart funnel={data.funnel} />
            </div>
          </Section>

          <Section title="Marketing Sources">
            <MarketingSourcesCard sources={data.marketingSources} />
          </Section>
        </>
      )}
    </div>
  );
}
