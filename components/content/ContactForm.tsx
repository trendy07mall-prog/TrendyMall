"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { submitContactForm } from "@/lib/contact";
import { isValidSriLankanPhone } from "@/lib/utils";
import { FieldError } from "@/components/ui/FieldError";
import { useToast } from "@/components/ui/ToastProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Fields {
  name: string;
  contact: string;
  orderNumber: string;
  message: string;
}

const EMPTY_FIELDS: Fields = { name: "", contact: "", orderNumber: "", message: "" };

type FieldErrors = Partial<Record<keyof Fields, string>>;

function validateFields(fields: Fields): FieldErrors {
  const errors: FieldErrors = {};
  if (!fields.name.trim()) errors.name = "Required.";
  if (!fields.contact.trim()) {
    errors.contact = "Required.";
  } else if (!EMAIL_RE.test(fields.contact) && !isValidSriLankanPhone(fields.contact)) {
    errors.contact = "Enter a valid email address or Sri Lankan phone number.";
  }
  if (!fields.message.trim()) errors.message = "Required.";
  return errors;
}

const inputClass = (hasError: boolean) =>
  `w-full min-h-11 rounded-[var(--radius-input)] border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
    hasError ? "border-red-600 focus:ring-red-600" : "border-[var(--border)] focus:ring-[var(--foreground)]"
  }`;

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  optionalHint,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  optionalHint?: boolean;
  type?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label} {optionalHint && <span className="font-normal text-[var(--muted)]">(optional)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={inputClass(Boolean(error))}
      />
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}

export function ContactForm() {
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success">("idle");
  const { showToast } = useToast();
  const honeypotRef = useRef<HTMLInputElement>(null);

  function updateField(field: keyof Fields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlur(field: keyof Fields) {
    setErrors((prev) => ({ ...prev, [field]: validateFields(fields)[field] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = validateFields(fields);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setStatus("sending");
    const formData = new FormData();
    formData.set("name", fields.name);
    formData.set("contact", fields.contact);
    formData.set("orderNumber", fields.orderNumber);
    formData.set("message", fields.message);
    // Honeypot -- left blank by real visitors (hidden below), a bot's
    // scripted form-fill typically populates every input it finds.
    formData.set("company", honeypotRef.current?.value ?? "");

    const result = await submitContactForm(formData);
    if (result.success) {
      setStatus("success");
    } else {
      setStatus("idle");
      showToast(result.error ?? "Something went wrong. Please try again.", { variant: "error" });
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <h3 className="text-lg font-semibold">Message sent</h3>
        <p className="text-sm text-[var(--muted)]">
          Thanks for reaching out — we&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Honeypot: off-screen (not display:none, which some bots skip),
          unreachable by keyboard tab order, and unlabeled for screen
          readers -- a real visitor never sees or fills it. */}
      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <input ref={honeypotRef} type="text" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <Field
        id="contact-name"
        label="Name"
        value={fields.name}
        onChange={(v) => updateField("name", v)}
        onBlur={() => handleBlur("name")}
        error={errors.name}
      />
      <Field
        id="contact-contact"
        label="Email or phone"
        value={fields.contact}
        onChange={(v) => updateField("contact", v)}
        onBlur={() => handleBlur("contact")}
        error={errors.contact}
      />
      <Field
        id="contact-order-number"
        label="Order number"
        value={fields.orderNumber}
        onChange={(v) => updateField("orderNumber", v)}
        optionalHint
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={4}
          value={fields.message}
          onChange={(e) => updateField("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          className={inputClass(Boolean(errors.message))}
        />
        {errors.message && <FieldError id="contact-message-error" message={errors.message} />}
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-[#F97316] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
