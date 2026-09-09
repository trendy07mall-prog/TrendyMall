import { createClient } from "@/lib/supabase/server";
import { CustomersManager } from "@/components/admin/customers/CustomersManager";
import type { CustomerSummary } from "@/lib/admin/customer-segments";

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("user_id, customer_name, customer_email, customer_phone, total, created_at")
    .order("created_at", { ascending: false });

  // Unchanged from before this redesign, deliberately: a customer is
  // whoever has a user_id on at least one order, and their name/email/phone
  // come from their most recent one (this list arrives newest-first, so the
  // first row seen per user_id is the latest). Guest orders carry no
  // user_id and are skipped, exactly as they always were.
  //
  // No account is excluded, the store owner's included -- their orders are
  // real activity and belong in the totals like anyone else's.
  const customersByUserId = new Map<string, CustomerSummary>();
  for (const order of orders ?? []) {
    if (!order.user_id) continue;
    const existing = customersByUserId.get(order.user_id);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += order.total;
    } else {
      customersByUserId.set(order.user_id, {
        userId: order.user_id,
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        orderCount: 1,
        totalSpent: order.total,
        lastOrderAt: order.created_at,
      });
    }
  }

  return <CustomersManager customers={[...customersByUserId.values()]} />;
}
