"use server";

import { requireAdminClient } from "@/lib/admin/guard";

// Read-only lookahead for the product form's SKU fields. Purely
// informational: it tells the admin, while they type, that a SKU is
// already spoken for, so they find out before filling in the rest of the
// row instead of at save time.
//
// It is deliberately NOT authoritative and nothing gates submission on it.
// The unique index on product_variants.sku is still the only thing that
// decides, and createProduct/updateProduct still handle the duplicate-key
// error exactly as before -- which matters, because between this check and
// the save another admin can claim the same SKU, and because an admin can
// always ignore the warning and submit anyway. Treat a "taken" answer as a
// hint and a "free" answer as "free a moment ago".
export async function checkVariantSku(
  sku: string,
  // The variant currently being edited, when there is one -- its own SKU
  // must not be reported as taken by itself.
  excludeVariantId?: string,
): Promise<{ taken: boolean } | { error: string }> {
  // Admin-gated like every other action in this directory. Server Actions
  // are reachable by direct POST, so the /admin layout check is not a
  // substitute for re-checking here, even for a read this narrow.
  const supabase = await requireAdminClient();

  const trimmed = sku.trim();
  if (!trimmed) return { taken: false };

  let query = supabase.from("product_variants").select("id").eq("sku", trimmed).limit(1);
  if (excludeVariantId) query = query.neq("id", excludeVariantId);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return { taken: (data ?? []).length > 0 };
}
