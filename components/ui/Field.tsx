"use client";

import { RequiredMark } from "@/components/ui/RequiredMark";
import { FieldError } from "@/components/ui/FieldError";

// Shared controlled text-field primitive for auth forms (Signup/Login) --
// same RequiredMark/FieldError/--color-error building blocks checkout's
// own Field uses, so the asterisk, error-highlight color, and inline
// message read identically everywhere, without retrofitting checkout's
// already-shipped local Field (a styling-only, zero-behavior-difference
// duplication is the lower-risk choice than touching verified code for a
// purely cosmetic-equivalence gain). Keeps this area's own established
// --radius-sm input styling rather than importing checkout's --radius-input
// — only the asterisk/error treatment needed to match, not the base shape.
export function Field({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        id={id}
        name={name ?? id}
        type={type}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-[var(--radius-sm)] border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
          error
            ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
            : "border-[var(--border)] focus:ring-[var(--foreground)]"
        }`}
      />
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}
