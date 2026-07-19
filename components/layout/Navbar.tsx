import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { CartCount } from "@/components/cart/CartCount";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <header className="border-b border-black dark:border-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          TrendyMall
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/cart" className="flex items-center gap-1">
            Cart
            <CartCount />
          </Link>
          {user ? (
            <>
              <Link href="/account/orders">Orders</Link>
              {isAdmin && <Link href="/admin">Admin</Link>}
              <form action={signOut}>
                <button type="submit" className="cursor-pointer">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/signup">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
