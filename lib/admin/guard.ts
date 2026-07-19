import "server-only";
import { createClient } from "@/lib/supabase/server";

// Every admin Server Action must call this first. It re-checks is_admin at
// the database layer (never trust the UI gate alone — Server Actions are
// reachable via direct POST requests, not just through app/admin/layout.tsx).
export async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) throw new Error("Unauthorized");

  return supabase;
}
