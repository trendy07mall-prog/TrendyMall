"use client";

import { useState } from "react";
import { requestStockNotification } from "@/lib/stock-notifications";

export function NotifyMeForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <p className="text-sm text-[var(--foreground)]">
        Thanks — we&apos;ll email you when this is back in stock.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setState("pending");
        const result = await requestStockNotification(productId, email);
        setState(result.ok ? "done" : "error");
      }}
      className="flex flex-col gap-2"
    >
      <p className="text-sm font-medium">Notify me when back in stock</p>
      <div className="flex max-w-sm gap-2">
        <label htmlFor="notify-email" className="sr-only">
          Email address
        </label>
        <input
          id="notify-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus-visible:border-[var(--foreground)]"
        />
        <button
          type="submit"
          disabled={state === "pending"}
          className="shrink-0 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          Notify me
        </button>
      </div>
      {state === "error" && (
        <p className="text-xs text-red-600">Something went wrong — please try again.</p>
      )}
    </form>
  );
}
