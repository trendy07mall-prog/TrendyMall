"use client";

import { useState } from "react";
import { subscribe } from "@/lib/subscribers";
import { FadeIn } from "@/components/motion/FadeIn";

// Same subscribe() server action as the footer's NewsletterSignup (writes
// to the real subscribers table) — this is a homepage-only, larger visual
// presentation of the identical working form, not a second submit path.
export function HomeNewsletter() {
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

  return (
    <section className="mx-auto w-full max-w-[var(--home-container-width)] px-6 py-[var(--home-section-padding-y)]">
      <FadeIn>
        <div className="flex flex-col items-center gap-4 rounded-[18px] bg-[#111111] px-6 py-14 text-center sm:px-14">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-white sm:text-[32px]">
            Stay Updated With Trendy Offers
          </h2>
          <p className="max-w-md text-sm text-white/70">
            Be the first to know about new arrivals, exclusive offers, and special
            promotions.
          </p>

          {submitted ? (
            <p className="mt-2 text-sm text-white">
              Thanks — you&apos;re on the list. We&apos;ll be in touch with new arrivals and
              offers.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-2 flex w-full max-w-md flex-col gap-2 sm:flex-row">
              <label htmlFor="home-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="home-newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="min-h-11 min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-5 text-sm text-white outline-none transition-[border-color,box-shadow] duration-200 ease-in-out placeholder:text-white/50 focus-visible:border-white focus-visible:ring-4 focus-visible:ring-white/10"
              />
              <button
                type="submit"
                className="min-h-11 shrink-0 rounded-full bg-white px-6 text-sm font-semibold text-[#111111] transition-opacity hover:opacity-85"
              >
                Subscribe
              </button>
            </form>
          )}
          {error && <p className="text-xs text-[#ff6b61]">{error}</p>}
        </div>
      </FadeIn>
    </section>
  );
}
