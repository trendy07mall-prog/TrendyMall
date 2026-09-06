"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const justSignedUp = searchParams.get("confirmEmail") === "1";
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | undefined>();
  // Separate from useTransition's `pending`: startTransition's callback is
  // async, and React stops tracking it at the first await, so `pending`
  // drops back to false while the sign-in request (and the navigation
  // after it) is still running. This one stays true until the page
  // actually leaves, so the button keeps saying "Logging in…" for as long
  // as the user is genuinely waiting.
  const [submitting, setSubmitting] = useState(false);

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
    event.preventDefault();
    const fieldErrors = validateLoginFields({ email, password });
    setErrors(fieldErrors);

    const firstInvalid = LOGIN_FIELD_FOCUS_ORDER.find((f) => fieldErrors[f.key]);
    if (firstInvalid) {
      requestAnimationFrame(() => {
        const el = document.getElementById(firstInvalid.domId);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setFormError(undefined);
    setSubmitting(true);
    startTransition(async () => {
      // Signing in through THIS tab's own browser Supabase client (not a
      // Server Action) is required, not a style choice -- CartContext's
      // guest-cart-merge listens for onAuthStateChange on this exact
      // client instance, which only fires for auth changes this client
      // itself witnesses. See lib/supabase/client-auth.ts's comment for
      // the full "why" (a Server Action's redirect never tells this tab's
      // client anything changed, so the merge silently never ran before).
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setFormError(error.message);
        setSubmitting(false);
        return;
      }
      // Soft navigation (not a full document load like sign-out does):
      // CartContext's onAuthStateChange has just fired and its
      // mergeCartOnLogin server action is in flight right now. Tearing the
      // page down mid-merge risks the merge committing server-side while
      // the client never clears its guest localStorage -- the next load
      // would then merge the same items a second time and double the
      // quantities. A soft transition lets it finish.
      //
      // refresh() is NOT redundant here, however tempting that looks:
      // push() on its own serves the destination from Next's client-side
      // Router Cache, and "/" has already been prefetched from the
      // Navbar's own logo/home link while sitting on /login -- i.e. cached
      // in its pre-login guest state. Measured directly: with push()
      // alone the header never corrected itself at all (10/10 trials,
      // >15s each); with refresh() alongside it, 5/5 corrected. refresh()
      // invalidates that cache so the render actually reflects the new
      // session cookie.
      router.refresh();
      router.push(redirectTo);
      // submitting stays true through the navigation on purpose -- the
      // destination render is what takes the time, and dropping the
      // pending state early is what made this look like "nothing
      // happened" for seconds after clicking.
    });
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

      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
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

        {formError && <FieldError message={formError} />}

        <button
          type="submit"
          disabled={submitting || pending}
          className="mt-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {submitting || pending ? "Logging in…" : "Log in"}
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
