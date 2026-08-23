import { AccountNav } from "@/components/account/AccountNav";
import { getMyProfile } from "@/lib/profile";

// /account/* is already auth-gated by proxy.ts (redirects to /login if
// not signed in) — no extra guard needed here.
//
// Profile is fetched once here (name/phone for the nav header) rather than
// separately in every page that also happens to need it — pages that need
// more than name/phone (e.g. email, for Profile's own form) still fetch
// getMyProfile()/auth.getUser() themselves; RLS makes the extra read cheap
// and this avoids threading profile data through props for pages that
// don't need it.
//
// Every /account/* page (including orders/ and orders/[id]/) relies on
// this layout's own wrapper alone — none of them have a separate max-w
// container of their own. Widening max-w-5xl -> max-w-6xl here gives the
// new Overview dashboard's cards more room and also gives the orders
// table a bit more breathing room; both are cosmetic, no page below
// changes its own structure to account for it.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const profile = await getMyProfile();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 md:flex-row">
      <AccountNav fullName={profile?.full_name ?? null} phone={profile?.phone ?? null} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
