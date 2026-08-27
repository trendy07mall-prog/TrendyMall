"use client";

import { useEffect, useRef, useState } from "react";
import { checkMySubscription, subscribe } from "@/lib/subscribers";
import { isValidEmail } from "@/lib/utils";

export function NewsletterSignup({ defaultEmail }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  // A logged-in customer whose email is already subscribed sees the
  // acknowledgement immediately — no typing or submitting required.
  useEffect(() => {
    if (!defaultEmail) return;
    let cancelled = false;
    checkMySubscription().then((subscribed) => {
      if (!cancelled && subscribed) setAlreadySubscribed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [defaultEmail]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setPending(true);
    const result = await subscribe(email, honeypotRef.current?.value);
    setPending(false);
    if (result.ok) {
      if (result.alreadySubscribed) {
        setAlreadySubscribed(true);
      } else {
        setSubmitted(true);
      }
      setEmail("");
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  if (alreadySubscribed) {
    // Footer.tsx is this component's only real caller (HomeNewsletter.tsx
    // looks similar but is a separate, independent implementation with its
    // own dark-card styling already) -- plain --foreground text used to be
    // fine there, but is near-invisible on the new navy footer, so this is
    // now a self-contained colored pill instead of relying on ambient text
    // color.
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/30 bg-[var(--color-success)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-success)]">
        ✓ You&apos;re already subscribed
      </span>
    );
  }

  if (submitted) {
    // Same self-contained treatment as the alreadySubscribed pill above,
    // for the same reason -- plain --foreground text is near-black, all
    // but invisible on Footer.tsx's navy card.
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success)]/30 bg-[var(--color-success)]/15 px-3 py-1.5 text-sm font-medium text-[var(--color-success)]">
        ✓ Thanks — you&apos;re on the list
      </span>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex max-w-sm gap-2">
        {/* Honeypot, same pattern as ContactForm.tsx's "company" field. */}
        <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <input ref={honeypotRef} type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none transition-[border-color,box-shadow] duration-200 ease-in-out placeholder:text-[var(--muted)] focus-visible:border-[var(--foreground)] focus-visible:ring-4 focus-visible:ring-[rgba(0,0,0,0.08)]"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {/* Footer.tsx is this component's only real caller now (HomeNewsletter.tsx
          has its own separate, already-dark-styled implementation) --
          text-red-600 reads fine on a light card but is too dark against
          the navy footer, so this reuses the exact coral HomeNewsletter.tsx
          already validated for the same "error text on a dark background"
          case, instead of leaving a light-background-oriented red. */}
      {error && <p className="mt-2 text-xs text-[#ff6b61]">{error}</p>}
    </div>
  );
}
