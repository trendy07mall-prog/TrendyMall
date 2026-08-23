"use client";

import { useEffect, useRef, useState } from "react";
import { checkMySubscription, subscribe } from "@/lib/subscribers";
import { isValidEmail } from "@/lib/utils";
import { FadeIn } from "@/components/motion/FadeIn";

// Same subscribe() server action as the footer's NewsletterSignup (writes
// to the real subscribers table) — this is a homepage-only, larger visual
// presentation of the identical working form, not a second submit path.
export function HomeNewsletter({ defaultEmail }: { defaultEmail?: string }) {
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

          {alreadySubscribed ? (
            <p className="mt-2 text-sm text-white">You&apos;re already subscribed ✓</p>
          ) : submitted ? (
            <p className="mt-2 text-sm text-white">
              Thanks — you&apos;re on the list. We&apos;ll be in touch with new arrivals and
              offers.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-2 flex w-full max-w-md flex-col gap-2 sm:flex-row">
              {/* Honeypot, same pattern as ContactForm.tsx's "company" field. */}
              <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
                <input ref={honeypotRef} type="text" tabIndex={-1} autoComplete="off" />
              </div>
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
                disabled={pending}
                className="min-h-11 shrink-0 rounded-full bg-white px-6 text-sm font-semibold text-[#111111] transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {pending ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}
          {error && <p className="text-xs text-[#ff6b61]">{error}</p>}
        </div>
      </FadeIn>
    </section>
  );
}
