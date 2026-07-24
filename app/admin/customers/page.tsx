import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

interface CustomerSummary {
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
}

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("user_id, customer_name, customer_email, customer_phone, total, created_at")
    .order("created_at", { ascending: false });

  const customersByUserId = new Map<string, CustomerSummary>();
  for (const order of orders ?? []) {
    const existing = customersByUserId.get(order.user_id);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += order.total;
    } else {
      customersByUserId.set(order.user_id, {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
        orderCount: 1,
        totalSpent: order.total,
        lastOrderAt: order.created_at,
      });
    }
  }

  const customers = [...customersByUserId.values()].sort(
    (a, b) => b.totalSpent - a.totalSpent,
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Customers</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {customers.length} customer{customers.length === 1 ? "" : "s"} who&apos;ve placed
        at least one order.
      </p>
      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Total spent</th>
              <th className="py-2">Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.email} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4">{customer.name}</td>
                <td className="py-2 pr-4">
                  <div>{customer.email}</div>
                  <div className="text-[var(--muted)]">{customer.phone}</div>
                </td>
                <td className="py-2 pr-4">{customer.orderCount}</td>
                <td className="py-2 pr-4">{formatPrice(customer.totalSpent)}</td>
                <td className="py-2">
                  {new Date(customer.lastOrderAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
