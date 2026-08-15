import { Suspense } from "react";
import { FinanceSidebar } from "@/components/admin/finance/FinanceSidebar";
import { FinanceDateRangePicker } from "@/components/admin/finance/FinanceDateRangePicker";
import { FinanceExportButton } from "@/components/admin/finance/FinanceExportButton";

// FinanceDateRangePicker/FinanceExportButton both call useSearchParams()
// (this layout, unlike a page, never receives a searchParams prop -- see
// their own comments) -- Next.js requires a Suspense boundary around any
// useSearchParams() consumer, same as app/login/page.tsx already does for
// login-form.tsx's identical use of the hook.
export default function AdminFinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Finance</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Revenue, payments, and orders — read directly from real order records, never recomputed.
          </p>
        </div>
        <Suspense>
          <div className="flex flex-wrap items-center gap-3">
            <FinanceDateRangePicker />
            <FinanceExportButton />
          </div>
        </Suspense>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <FinanceSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
