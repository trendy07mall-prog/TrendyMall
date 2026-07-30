import Link from "next/link";

// Shown only on a guest order's own /checkout/success page. Links to
// /signup with email/name prefilled (app/signup/page.tsx reads these as
// search params) rather than duplicating a second signup form here.
export function CreateAccountPrompt({
  email,
  fullName,
}: {
  email?: string;
  fullName?: string;
}) {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (fullName) params.set("fullName", fullName);
  const href = `/signup${params.size > 0 ? `?${params.toString()}` : ""}`;

  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 text-left">
      <p className="text-sm font-medium">Create an account?</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Track this order, save your address for next time, and check out faster later.
      </p>
      <Link
        href={href}
        className="transition-brand mt-3 inline-block rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)]"
      >
        Create an account
      </Link>
    </div>
  );
}
