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
    return <p className="text-sm text-[var(--foreground)]">You&apos;re already subscribed ✓</p>;
  }

  if (submitted) {
    return (
      <p className="text-sm text-[var(--foreground)]">
        Thanks — you&apos;re on the list. We&apos;ll be in touch with new
        arrivals and offers.
      </p>
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
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
