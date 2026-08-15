import { formatPrice } from "@/lib/utils";
import { CashIcon, BankIcon, CreditCardIcon } from "@/components/ui/Icon";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import type { FinancePaymentMethodStat } from "@/lib/admin/finance-shared";
import type { PaymentGateway } from "@/types";

const METHOD_ICON: Record<PaymentGateway, (props: { className?: string }) => React.ReactElement> = {
  cod: CashIcon,
  bank_transfer: BankIcon,
  payhere: CreditCardIcon,
};

// Online Payment (PayHere) renders as inactive/-- whenever the store hasn't
// turned it on in Settings -- same "not live yet" treatment checkout itself
// already gives it (components/checkout/CheckoutForm.tsx's PaymentMethodCard
// comingSoon prop), not a second interpretation invented for Finance.
export function PaymentOverviewCards({
  stats,
  onlinePaymentEnabled,
}: {
  stats: FinancePaymentMethodStat[];
  onlinePaymentEnabled: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        Payment Overview
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = METHOD_ICON[stat.method];
          const inactive = stat.method === "payhere" && !onlinePaymentEnabled;
          return (
            <div
              key={stat.method}
              className={`rounded-[var(--radius-md)] border border-[var(--border)] p-3 ${inactive ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
                <span className="text-sm font-medium">{PAYMENT_METHOD_LABELS[stat.method]}</span>
              </div>
              {inactive ? (
                <p className="mt-2 text-sm text-[var(--muted)]">Not active</p>
              ) : (
                <>
                  <p className="mt-2 text-lg font-semibold">{formatPrice(stat.amount)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {stat.count} order{stat.count === 1 ? "" : "s"}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
