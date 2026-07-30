import { AccountNav } from "@/components/account/AccountNav";

// /account/* is already auth-gated by proxy.ts (redirects to /login if
// not signed in) — no extra guard needed here.
//
// app/account/orders/page.tsx and [id]/page.tsx already have their own
// (mx-auto max-w-*, px-6 py-12) wrapper and stay untouched this phase —
// nesting them under this shared padding means their content sits with a
// bit more surrounding whitespace than before (harmless, cosmetic only,
// not worth revising already-shipped v10 order pages for). The three new
// pages this phase adds (account/, addresses/, preferences/) rely on
// this layout's spacing alone, with no padding of their own.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 md:flex-row">
      <AccountNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
