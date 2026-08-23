"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/app/auth/actions";
import { Field } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/FieldError";

type FieldKey = "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldKey, string>>;

// Same validation shape as SignupForm.tsx's password section (min 6 chars,
// same message wording) -- this form doesn't invent a new password rule,
// just applies the existing one to a change instead of a creation.
function validateFields(fields: { password: string; confirmPassword: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.password) {
    errors.password = "Please enter a new password.";
  } else if (fields.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  if (!fields.confirmPassword) {
    errors.confirmPassword = "Please confirm your new password.";
  } else if (fields.password && fields.confirmPassword !== fields.password) {
    errors.confirmPassword = "Passwords don't match.";
  }
  return errors;
}

const FOCUS_ORDER: { key: FieldKey; domId: string }[] = [
  { key: "password", domId: "settings-password" },
  { key: "confirmPassword", domId: "settings-confirmPassword" },
];

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleFieldChange(field: FieldKey, value: string) {
    const next = { password, confirmPassword, [field]: value };
    if (field === "password") setPassword(value);
    else setConfirmPassword(value);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: validateFields(next)[field] } : prev));
  }

  function handleBlur(field: FieldKey) {
    setErrors((prev) => ({ ...prev, [field]: validateFields({ password, confirmPassword })[field] }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const fieldErrors = validateFields({ password, confirmPassword });
    setErrors(fieldErrors);
    const firstInvalid = FOCUS_ORDER.find((f) => fieldErrors[f.key]);
    if (firstInvalid) {
      event.preventDefault();
      requestAnimationFrame(() => {
        const el = document.getElementById(firstInvalid.domId);
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  if (state?.success) {
    return <p className="text-sm text-[var(--color-success)]">Password updated successfully.</p>;
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <Field
        id="settings-password"
        name="password"
        label="New password"
        type="password"
        value={password}
        onChange={(v) => handleFieldChange("password", v)}
        onBlur={() => handleBlur("password")}
        error={errors.password}
        autoComplete="new-password"
        required
      />
      <Field
        id="settings-confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
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
        className="transition-brand self-start rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
      >
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
