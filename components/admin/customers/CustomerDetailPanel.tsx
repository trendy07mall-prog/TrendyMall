"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { getCustomerDetail, saveCustomerNote, type CustomerDetail } from "@/lib/admin/customers";
import { initialsOf, type CustomerSummary } from "@/lib/admin/customer-segments";

// Mounted by the parent only while a customer is selected, so the loaded
// detail naturally starts fresh on every open with no effect needed to
// reset it -- the same reason FilterDrawer is mounted conditionally.
export function CustomerDetailPanel({
  customer,
  onClose,
}: {
  customer: CustomerSummary;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getCustomerDetail(customer.userId).then(
      (result) => {
        if (active) setDetail(result);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [customer.userId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const averageOrderValue =
    customer.orderCount > 0 ? customer.totalSpent / customer.orderCount : 0;

  // Reuses the Orders page's existing search filter rather than adding a
  // customer filter to it, which would mean changing another admin page.
  // Phone first: it identifies a person far more tightly than a name, and
  // getAdminOrders' .or() covers customer_phone and customer_name but not
  // customer_email, so email is not an option here.
  const ordersHref = `/admin/orders?search=${encodeURIComponent(customer.phone || customer.name)}`;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close customer details"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${customer.name} details`}
        // Near-full-width on a phone, a fixed 520px panel from ~560px up.
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col overflow-y-auto bg-[var(--color-card)] shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ac-navy-soft)] text-sm font-semibold text-[var(--ac-navy)]"
          >
            {initialsOf(customer.name, customer.email)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-heading text-lg font-bold">{customer.name}</h2>
            <a
              href={`mailto:${customer.email}`}
              className="block truncate text-sm text-[var(--ac-navy)] hover:underline"
            >
              {customer.email}
            </a>
            <p className="mt-0.5 text-xs text-[var(--ac-text-3)]">
              {detail?.firstOrderAt
                ? `Customer since ${new Date(detail.firstOrderAt).toLocaleDateString()}`
                : "Customer since —"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-full px-2 py-1 text-lg leading-none hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-[var(--border)] px-5 py-4">
          {[
            { label: "Orders", value: String(customer.orderCount) },
            { label: "Total spent", value: formatPrice(customer.totalSpent) },
            { label: "Avg order", value: formatPrice(averageOrderValue) },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-[10px] bg-[var(--ac-navy-soft)] px-3 py-2.5">
              <p className="text-[11px] text-[var(--ac-text-2)]">{kpi.label}</p>
              <p className="mt-0.5 text-[15px] font-bold text-[var(--ac-navy)]">{kpi.value}</p>
            </div>
          ))}
        </div>

        <section className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-sm font-semibold">Order history</h3>
          {failed && <p className="mt-2 text-sm text-red-600">Could not load this customer.</p>}
          {!detail && !failed && (
            <p className="mt-2 text-sm text-[var(--ac-text-2)]">Loading…</p>
          )}
          {detail && (
            <>
              <ul className="mt-3 flex flex-col gap-2">
                {detail.orders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="block truncate text-sm font-medium text-[var(--ac-navy)] hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-[var(--ac-text-3)]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm">{formatPrice(order.total)}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </li>
                ))}
                {detail.orders.length === 0 && (
                  <li className="text-sm text-[var(--ac-text-2)]">No orders found.</li>
                )}
              </ul>
              <Link
                href={ordersHref}
                className="mt-3 inline-block text-sm font-medium text-[var(--ac-navy)] hover:underline"
              >
                View all {detail.totalOrderCount} orders →
              </Link>
            </>
          )}
        </section>

        <section className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-sm font-semibold">Saved addresses</h3>
          {detail && detail.addresses.length === 0 && (
            <p className="mt-2 text-sm text-[var(--ac-text-2)]">
              No shipping address on file.
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {(detail?.addresses ?? []).map((address, i) => (
              <li
                key={i}
                className="rounded-[10px] border border-[var(--border)] px-3 py-2 text-sm"
              >
                <p className="font-medium">{address.name}</p>
                <p className="text-[var(--ac-text-2)]">
                  {address.street}, {address.city}, {address.district}
                  {address.postalCode ? ` ${address.postalCode}` : ""}
                </p>
                <p className="text-[var(--ac-text-3)]">{address.phone}</p>
              </li>
            ))}
          </ul>
        </section>

        {detail && <AdminNotes userId={customer.userId} initialNote={detail.note} />}
      </div>
    </div>
  );
}

// Explicit save rather than autosave: this is free text an admin may be
// part-way through typing, and a debounced write would persist half a
// sentence and then race the next keystroke. A visible Save with a
// confirmation is also the only way the admin can tell the note actually
// reached the database, which matters when the failure mode (a missing
// table, a lapsed session) is silent otherwise.
function AdminNotes({ userId, initialNote }: { userId: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  // What is actually in the database right now, so "nothing to save" stays
  // accurate after the first save -- comparing against the prop would keep
  // measuring against the note as it was when the panel opened.
  const [savedNote, setSavedNote] = useState(initialNote);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save() {
    setState("saving");
    try {
      const result = await saveCustomerNote(userId, note);
      if ("error" in result) {
        setState("error");
        setMessage(result.error);
        return;
      }
      setSavedNote(note);
      setState("saved");
      setMessage("");
    } catch {
      setState("error");
      setMessage("Could not save. Check you are still signed in.");
    }
  }

  return (
    <section className="px-5 py-4">
      <h3 className="text-sm font-semibold">Admin notes</h3>
      <p className="mt-1 text-xs text-[var(--ac-text-3)]">
        Only visible here. Never shown to the customer.
      </p>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setState("idle");
        }}
        rows={4}
        placeholder="Anything worth remembering about this customer…"
        className="mt-2 w-full rounded-[10px] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--ac-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--ac-navy)]"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={state === "saving" || note === savedNote}
          className="rounded-full bg-[var(--ac-navy)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save note"}
        </button>
        <span aria-live="polite" className="text-xs">
          {state === "saved" && <span className="text-[var(--ac-green)]">Saved</span>}
          {state === "error" && <span className="text-red-600">{message}</span>}
        </span>
      </div>
    </section>
  );
}
