"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    // No backend yet — this is intentionally local-only.
    setSubmitted(true);
    setEmail("");
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
  );
}
