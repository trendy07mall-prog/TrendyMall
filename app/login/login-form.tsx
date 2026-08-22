"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login } from "@/app/auth/actions";
import { Field } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

type LoginFieldKey = "email" | "password";
type LoginFieldErrors = Partial<Record<LoginFieldKey, string>>;

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Please enter your email address.";
  if (!value.includes("@")) return "Please enter a valid email address.";
  return undefined;
}

// No length/format check on password here — unlike Signup, this is
// proving you already know an existing password, not creating one under a
// rule this form owns. Empty is the only thing worth catching client-side;
// anything else is the server's "invalid credentials" response.
function validateLoginFields(fields: { email: string; password: string }): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const emailError = validateEmail(fields.email);
  if (emailError) errors.email = emailError;
  if (!fields.password) errors.password = "Please enter your password.";
  return errors;
}

const LOGIN_FIELD_FOCUS_ORDER: { key: LoginFieldKey; domId: string }[] = [
  { key: "email", domId: "email" },
  { key: "password", domId: "password" },
];

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const justSignedUp = searchParams.get("confirmEmail") === "1";
  const [state, action, pending] = useActionState(login, undefined);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginFieldErrors>({});

  function handleFieldChange(field: LoginFieldKey, value: string) {
    const nextFields = { email, password, [field]: value };
    if (field === "email") setEmail(value);
    else setPassword(value);

    setErrors((prev) => (prev[field] ? { ...prev, [field]: validateLoginFields(nextFields)[field] } : prev));
  }

  function handleBlur(field: LoginFieldKey) {
    setErrors((prev) => ({ ...prev, [field]: validateLoginFields({ email, password })[field] }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const fieldErrors = validateLoginFields({ email, password });
    setErrors(fieldErrors);

    const firstInvalid = LOGIN_FIELD_FOCUS_ORDER.find((f) => fieldErrors[f.key]);
    if (firstInvalid) {
      event.preventDefault();
      requestAnimationFrame(() => {
        const el = document.getElementById(firstInvalid.domId);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-20">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Log in
      </h1>
      <p className="mt-2 text-xs text-[var(--muted)]">
        <span className="text-[var(--color-error)]">*</span> Required fields
      </p>

      {justSignedUp && (
        <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm">
          Account created. Check your email to confirm it, then log in.
        </p>
      )}

      <form action={action} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="redirect" value={redirectTo} />

        <Field
          id="email"
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={(v) => handleFieldChange("email", v)}
          onBlur={() => handleBlur("email")}
          error={errors.email}
          autoComplete="email"
          required
        />
        <Field
          id="password"
          name="password"
          label="Password"
          type="password"
          value={password}
          onChange={(v) => handleFieldChange("password", v)}
          onBlur={() => handleBlur("password")}
          error={errors.password}
          autoComplete="current-password"
          required
        />

        {state?.error && <FieldError message={state.error} />}

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
