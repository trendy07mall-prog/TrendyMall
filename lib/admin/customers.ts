"use server";

import { requireAdminClient } from "@/lib/admin/guard";
import type { OrderFulfillmentStatus } from "@/types";

export interface CustomerOrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: OrderFulfillmentStatus;
}

export interface CustomerAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  postalCode: string | null;
}

export interface CustomerDetail {
  orders: CustomerOrderRow[];
  totalOrderCount: number;
  firstOrderAt: string | null;
  addresses: CustomerAddress[];
  note: string;
}

// How many orders the panel lists before deferring to the Orders page.
const PANEL_ORDER_LIMIT = 8;

// Loaded when the panel opens rather than with the list, so the page cost
// doesn't scale with the number of customers -- only the one being looked
// at is ever fetched.
export async function getCustomerDetail(userId: string): Promise<CustomerDetail> {
  const supabase = await requireAdminClient();

  const [ordersResult, countResult, firstResult, noteResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, created_at, total, order_status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(PANEL_ORDER_LIMIT),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    // "Customer since" is the first order, matching how this page defines a
    // customer in the first place (someone who has ordered) rather than the
    // auth account's creation date, which may predate any purchase.
    supabase
      .from("orders")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("customer_notes").select("note").eq("customer_id", userId).maybeSingle(),
  ]);

  const orders = (ordersResult.data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    createdAt: o.created_at,
    total: o.total,
    status: o.order_status as OrderFulfillmentStatus,
  }));

  return {
    orders,
    totalOrderCount: countResult.count ?? orders.length,
    firstOrderAt: firstResult.data?.created_at ?? null,
    addresses: await getCustomerAddresses(supabase, userId),
    // A missing customer_notes row is the normal case for a customer nobody
    // has written about yet, so it reads as an empty note, not an error.
    // Reading it also fails soft: see below.
    note: noteResult.data?.note ?? "",
  };
}

// Deliberately sourced from shipping_addresses (the per-order snapshot),
// NOT customer_addresses (the customer's own address book).
//
// The address book's RLS is owner-only -- `auth.uid() = customer_id`, with
// no admin policy (sql/030) -- so an admin reading it would silently get
// zero rows for everyone. shipping_addresses grants admins select access
// (sql/020), and it is genuinely "what this customer has had shipped to
// them", which is what the panel is for. Giving the address book an admin
// policy would be a change to existing permissions, so it stays untouched.
async function getCustomerAddresses(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  userId: string,
): Promise<CustomerAddress[]> {
  const { data: orderIds } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (!orderIds || orderIds.length === 0) return [];

  const { data } = await supabase
    .from("shipping_addresses")
    .select("first_name, last_name, phone, street, city, district, postal_code")
    .in(
      "order_id",
      orderIds.map((o) => o.id),
    );

  // The same address repeated across orders is one address, not five. Keyed
  // on the parts that identify a place, so a phone number changing between
  // orders doesn't split one address into two entries.
  const seen = new Map<string, CustomerAddress>();
  for (const row of data ?? []) {
    const key = [row.street, row.city, row.district, row.postal_code ?? ""]
      .join("|")
      .toLowerCase();
    if (seen.has(key)) continue;
    seen.set(key, {
      name: `${row.first_name} ${row.last_name}`.trim(),
      phone: row.phone,
      street: row.street,
      city: row.city,
      district: row.district,
      postalCode: row.postal_code,
    });
  }
  return [...seen.values()];
}

export type SaveNoteResult = { ok: true } | { error: string };

// Upsert on customer_id, which is the table's primary key -- one note per
// customer, no history (see sql/076). Admin-gated twice over: this action
// re-verifies through requireAdminClient, and every policy on the table
// requires is_admin() regardless of what reaches it.
export async function saveCustomerNote(
  userId: string,
  note: string,
): Promise<SaveNoteResult> {
  const supabase = await requireAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("customer_notes")
    .upsert(
      { customer_id: userId, note, updated_by: user?.id ?? null },
      { onConflict: "customer_id" },
    );

  if (error) return { error: error.message };
  return { ok: true };
}
