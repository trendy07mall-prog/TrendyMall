import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="flex flex-col gap-8 sm:flex-row">
        <aside className="flex shrink-0 flex-row gap-4 border-b border-[var(--border)] pb-4 sm:w-48 sm:flex-col sm:border-r sm:border-b-0 sm:pr-6 sm:pb-0">
          <Link href="/admin" className="text-sm font-medium hover:underline">
            Dashboard
          </Link>
          <Link
            href="/admin/products"
            className="text-sm font-medium hover:underline"
          >
            Products
          </Link>
          <Link
            href="/admin/orders"
            className="text-sm font-medium hover:underline"
          >
            Orders
          </Link>
          <Link
            href="/admin/reviews"
            className="text-sm font-medium hover:underline"
          >
            Reviews
          </Link>
          <Link
            href="/admin/banner"
            className="text-sm font-medium hover:underline"
          >
            Banner
          </Link>
          <Link
            href="/admin/subscribers"
            className="text-sm font-medium hover:underline"
          >
            Subscribers
          </Link>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
