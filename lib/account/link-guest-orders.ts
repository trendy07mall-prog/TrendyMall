"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Claims any orders placed as a guest under this account's own confirmed
// e-mail, and seeds the address book from what those orders recorded. All
// of the matching and all of the authorisation live in the SQL function
// (sql/084) -- this passes nothing in, because there is nothing to pass:
// the function reads the caller's identity from the session itself, so a
// client cannot ask it to link somebody else's address.
//
// Idempotent by construction. It only ever matches orders whose user_id is
// still NULL, so a second call finds nothing and returns 0 before doing
// any further work.
export async function linkGuestOrders(): Promise<{ linked: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("link_guest_orders_to_current_user");

  if (error) {
    // Never surfaced to the customer: this runs in the background on an
    // account page that has already rendered, and failing to link is not
    // a reason to show anyone an error. Logged so it is diagnosable.
    console.warn("[link-guest-orders] rpc failed", { message: error.message, code: error.code });
    return { linked: 0 };
  }

  const linked = typeof data === "number" ? data : 0;

  if (linked > 0) {
    // These three are what actually change: the orders list, the overview's
    // recent-order card, and the address book seeded above.
    revalidatePath("/account");
    revalidatePath("/account/orders");
    revalidatePath("/account/addresses");
  }

  return { linked };
}
