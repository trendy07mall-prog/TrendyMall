"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/app/auth/actions";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-20">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Sign up
      </h1>

      <form action={action} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className={inputClass}
          />
        </div>

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
            minLength={6}
            className={inputClass}
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
