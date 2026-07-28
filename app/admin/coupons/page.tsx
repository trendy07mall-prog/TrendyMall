import { createClient } from "@/lib/supabase/server";
import { CouponsManager } from "@/components/admin/CouponsManager";

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Coupons</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Percentage, fixed-amount, or free-shipping discount codes. Validation and the
        actual discount are always computed server-side at checkout.
      </p>
      <div className="mt-6">
        <CouponsManager coupons={coupons ?? []} />
      </div>
    </div>
  );
}
