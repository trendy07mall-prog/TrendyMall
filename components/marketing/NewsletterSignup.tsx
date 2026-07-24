"use client";

import { useState } from "react";
import { subscribe } from "@/lib/subscribers";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setError("");
    const result = await subscribe(email);
    if (result.ok) {
      setSubmitted(true);
      setEmail("");
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
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
          className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus-visible:border-[var(--foreground)]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
        >
          Subscribe
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
