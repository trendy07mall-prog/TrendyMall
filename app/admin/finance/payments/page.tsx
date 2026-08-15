import { CashIcon, BankIcon, CreditCardIcon } from "@/components/ui/Icon";
import { getFinanceOverview, resolveFinanceRangeWindow } from "@/lib/admin/finance-query";
import { parseFinanceRangeState } from "@/lib/admin/finance-filters";
import { getPaymentSettings } from "@/lib/data/settings";
import { formatPrice } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import type { PaymentGateway } from "@/types";

const METHOD_ICON: Record<PaymentGateway, (props: { className?: string }) => React.ReactElement> = {
  cod: CashIcon,
  bank_transfer: BankIcon,
  payhere: CreditCardIcon,
};

export default async function AdminFinancePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rangeState = parseFinanceRangeState(sp);
  const window = resolveFinanceRangeWindow(rangeState.range, rangeState.customFrom, rangeState.customTo);

  const [overview, paymentSettings] = await Promise.all([getFinanceOverview(window), getPaymentSettings()]);

  const totalAmount = overview.paymentMethods.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        Payment Methods
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--color-text-secondary)]">
              <th className="py-2 pr-4 font-medium">Method</th>
              <th className="py-2 pr-4 text-right font-medium">Orders</th>
              <th className="py-2 pr-4 text-right font-medium">Amount</th>
              <th className="py-2 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {overview.paymentMethods.map((stat) => {
              const Icon = METHOD_ICON[stat.method];
              const inactive = stat.method === "payhere" && !paymentSettings.onlinePaymentEnabled;
              const share = totalAmount > 0 ? (stat.amount / totalAmount) * 100 : 0;
              return (
                <tr key={stat.method} className={`border-b border-[var(--border)] last:border-0 ${inactive ? "opacity-50" : ""}`}>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
                      {PAYMENT_METHOD_LABELS[stat.method]}
                    </span>
                  </td>
                  {inactive ? (
                    <td colSpan={3} className="py-2.5 text-right text-[var(--muted)]">
                      Not active
                    </td>
                  ) : (
                    <>
                      <td className="py-2.5 pr-4 text-right [font-variant-numeric:tabular-nums]">{stat.count}</td>
                      <td className="py-2.5 pr-4 text-right font-medium [font-variant-numeric:tabular-nums]">
                        {formatPrice(stat.amount)}
                      </td>
                      <td className="py-2.5 text-right text-[var(--color-text-secondary)] [font-variant-numeric:tabular-nums]">
                        {share.toFixed(1)}%
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
