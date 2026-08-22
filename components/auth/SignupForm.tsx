"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { Field } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

type SignupFieldKey = "firstName" | "lastName" | "email" | "password" | "confirmPassword";
type SignupFieldErrors = Partial<Record<SignupFieldKey, string>>;

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Please enter your email address.";
  if (!value.includes("@")) return "Please enter a valid email address.";
  return undefined;
}

interface SignupFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Password length (6) matches the pre-existing native minLength={6} exactly
// -- not a new rule, just expressed as an inline message instead of the
// browser's default popup. Confirm Password is genuinely new (didn't exist
// before), but stays entirely client-side: the signup Server Action only
// ever reads "password" from FormData, so this field is never even
// submitted to it -- adding it can't touch how accounts are created.
function validateSignupFields(fields: SignupFields): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  if (!fields.firstName.trim()) errors.firstName = "Please enter your first name.";
  if (!fields.lastName.trim()) errors.lastName = "Please enter your last name.";
  const emailError = validateEmail(fields.email);
  if (emailError) errors.email = emailError;
  if (!fields.password) {
    errors.password = "Please enter a password.";
  } else if (fields.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  if (!fields.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (fields.password && fields.confirmPassword !== fields.password) {
    errors.confirmPassword = "Passwords don't match.";
  }
  return errors;
}

// Fixed DOM order of every required field -- used only to find the FIRST
// invalid one to focus/scroll to on a failed submit, same pattern as
// checkout's REQUIRED_FIELD_FOCUS_ORDER.
const SIGNUP_FIELD_FOCUS_ORDER: { key: SignupFieldKey; domId: string }[] = [
  { key: "firstName", domId: "firstName" },
  { key: "lastName", domId: "lastName" },
  { key: "email", domId: "email" },
  { key: "password", domId: "password" },
  { key: "confirmPassword", domId: "confirmPassword" },
];

export function SignupForm({
  defaultFullName,
  defaultEmail,
}: {
  defaultFullName?: string;
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState(signup, undefined);

  // A guest order's stored customerName arrives as one combined string
  // (CreateAccountPrompt.tsx) -- split on whitespace to prefill the two
  // visual inputs below. Best-effort only; the customer can always correct
  // it, same as any other prefilled value.
  const [prefillFirst, ...prefillRest] = (defaultFullName ?? "").trim().split(/\s+/).filter(Boolean);

  const [firstName, setFirstName] = useState(prefillFirst ?? "");
  const [lastName, setLastName] = useState(prefillRest.join(" "));
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<SignupFieldErrors>({});

  // Blur-validates the first time, then live-validates on every keystroke
  // once an error has actually been shown for that field -- same pattern
  // as checkout's updateField/setField. Password<->Confirm Password stay
  // independent (each only re-validates its OWN prior error), matching
  // checkout's deliberate choice not to cascade revalidation across
  // related fields.
  function handleFieldChange(field: SignupFieldKey, value: string) {
    const nextFields: SignupFields = { firstName, lastName, email, password, confirmPassword, [field]: value };
    if (field === "firstName") setFirstName(value);
    else if (field === "lastName") setLastName(value);
    else if (field === "email") setEmail(value);
    else if (field === "password") setPassword(value);
    else setConfirmPassword(value);

    setErrors((prev) =>
      prev[field] ? { ...prev, [field]: validateSignupFields(nextFields)[field] } : prev,
    );
  }

  function handleBlur(field: SignupFieldKey) {
    setErrors((prev) => ({
      ...prev,
      [field]: validateSignupFields({ firstName, lastName, email, password, confirmPassword })[field],
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const fieldErrors = validateSignupFields({ firstName, lastName, email, password, confirmPassword });
    setErrors(fieldErrors);

    const firstInvalid = SIGNUP_FIELD_FOCUS_ORDER.find((f) => fieldErrors[f.key]);
    if (firstInvalid) {
      event.preventDefault();
      requestAnimationFrame(() => {
        const el = document.getElementById(firstInvalid.domId);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    // Otherwise let the native submit proceed — useActionState's action
    // fires exactly as before, completely untouched.
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-20">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Sign up
      </h1>
      <p className="mt-2 text-xs text-[var(--muted)]">
        <span className="text-[var(--color-error)]">*</span> Required fields
      </p>

      <form action={action} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        {/* Server action still receives one combined "fullName" value,
            exactly as before — the two visual inputs below are a pure
            presentation change, never a change to what signup() reads. */}
        <input type="hidden" name="fullName" value={`${firstName} ${lastName}`.trim()} />

        <Field
          id="firstName"
          label="First name"
          value={firstName}
          onChange={(v) => handleFieldChange("firstName", v)}
          onBlur={() => handleBlur("firstName")}
          error={errors.firstName}
          autoComplete="given-name"
          required
        />
        <Field
          id="lastName"
          label="Last name"
          value={lastName}
          onChange={(v) => handleFieldChange("lastName", v)}
          onBlur={() => handleBlur("lastName")}
          error={errors.lastName}
          autoComplete="family-name"
          required
        />
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
          autoComplete="new-password"
          required
        />
        <Field
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(v) => handleFieldChange("confirmPassword", v)}
          onBlur={() => handleBlur("confirmPassword")}
          error={errors.confirmPassword}
          autoComplete="new-password"
          required
        />

        {state?.error && <FieldError message={state.error} />}

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
