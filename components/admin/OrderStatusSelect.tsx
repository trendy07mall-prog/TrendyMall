"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/lib/admin/orders";
import type { OrderStatus } from "@/types";

const STATUSES: OrderStatus[] = [
  "pending_payment",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as OrderStatus;
          setValue(next);
          startTransition(async () => {
            await updateOrderStatus(orderId, next);
          });
        }}
        className="border border-black bg-transparent px-2 py-1 text-sm dark:border-white"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ")}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-zinc-500">Saving…</span>}
    </div>
  );
}
