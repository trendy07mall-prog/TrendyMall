import type { Metadata } from "next";
import Link from "next/link";
import { getMyNotifications } from "@/lib/account/notifications";
import { BellIcon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Notifications — TrendyMall" };

export default async function AccountNotificationsPage() {
  const notifications = await getMyNotifications();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Notifications</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Updates on your order status changes.</p>

      {notifications.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <BellIcon className="h-6 w-6 text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">
            No notifications yet — you&apos;ll see updates here when your orders change status.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-3"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5">
                <BellIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/account/orders/${n.orderId}`} className="font-medium hover:underline">
                    Order {n.orderNumber}
                  </Link>{" "}
                  — {n.statusLabel}
                </p>
                {n.note && <p className="mt-0.5 text-xs text-[var(--muted)]">{n.note}</p>}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
