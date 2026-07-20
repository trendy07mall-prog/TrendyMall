"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/auth/actions";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const justSignedUp = searchParams.get("confirmEmail") === "1";
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-20">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Log in
      </h1>

      {justSignedUp && (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm">
          Account created. Check your email to confirm it, then log in.
        </p>
      )}

      <form action={action} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="redirect" value={redirectTo} />

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={inputClass}
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
