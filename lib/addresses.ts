"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidSriLankanPhone } from "@/lib/utils";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import type { CustomerAddress } from "@/types";

// `id` is populated on success too (not just `error`) — AddressForm.tsx
// (useActionState) only ever reads `.error`, so this is additive; checkout's
// inline address flow (CheckoutAddress.tsx) reads `.id` to link a
// freshly-created address as the order's source_address_id without a
// separate follow-up query.
export type AddressFormState = { error: string; id?: undefined } | { error?: undefined; id: string } | undefined;

export async function getMyAddresses(): Promise<CustomerAddress[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("is_deleted", false)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Backs the cart page's delivery estimate — once a logged-in customer has
// a default address, the cart can show its real fee instead of a range
// (app/cart/page.tsx). Returns null for a guest (no session) or a
// logged-in customer with no saved addresses yet, both of which fall back
// to the plain area-toggle estimate.
export async function getMyDefaultAddress(): Promise<CustomerAddress | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("customer_addresses")
    .select("*")
    .eq("is_deleted", false)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// Create-or-update via a hidden `id` field, same shape as
// lib/admin/coupons.ts's saveCoupon. Never writes is_default = true
// directly — that's set_default_address's job alone (see sql/030's
// comment on why a plain insert/update racing the partial unique index
// is unsafe), called as a follow-up step below when needed.
export async function saveAddress(
  _prevState: AddressFormState,
  formData: FormData,
): Promise<AddressFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const id = String(formData.get("id") ?? "").trim() || null;
  const addressLabel = String(formData.get("addressLabel") ?? "").trim() || null;
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const district = String(formData.get("district") ?? "");
  const postalCode = String(formData.get("postalCode") ?? "").trim() || null;
  const makeDefault = formData.get("isDefault") === "on";

  if (!firstName || !lastName || !street || !city) {
    return { error: "Fill in all required fields." };
  }
  if (!isValidSriLankanPhone(phone)) {
    return { error: "Enter a valid Sri Lankan phone number." };
  }
  if (!(SRI_LANKAN_DISTRICTS as readonly string[]).includes(district)) {
    return { error: "Select a district." };
  }

  const row = {
    customer_id: user.id,
    address_label: addressLabel,
    first_name: firstName,
    last_name: lastName,
    phone,
    street,
    city,
    district,
    postal_code: postalCode,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("customer_addresses").update(row).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("customer_addresses")
      .insert(row)
      .select("id")
      .single();
    if (error) return { error: error.message };
    savedId = data.id;
  }

  if (savedId && makeDefault) {
    const { error } = await supabase.rpc("set_default_address", { p_address_id: savedId });
    if (error) return { error: error.message };
  } else if (savedId && !id) {
    // First address ever created has nothing to be a "default" against
    // yet — make it the default automatically so checkout always has one
    // to preselect.
    const { count } = await supabase
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .eq("is_deleted", false);
    if (count === 1) {
      const { error } = await supabase.rpc("set_default_address", { p_address_id: savedId });
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/account/addresses");
  return savedId ? { id: savedId } : undefined;
}

export async function deleteAddress(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_addresses")
    .update({ is_deleted: true, is_default: false })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/account/addresses");
  return {};
}

export async function setDefaultAddress(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_default_address", { p_address_id: id });
  if (error) return { error: error.message };
  revalidatePath("/account/addresses");
  return {};
}
