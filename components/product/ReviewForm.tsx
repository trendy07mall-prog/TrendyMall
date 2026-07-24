"use client";

import { useState } from "react";
import { submitReview } from "@/lib/submit-review";
import { StarRating } from "@/components/product/StarRating";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (done) {
    return (
      <p className="text-sm text-[var(--foreground)]">
        Thanks for your review — it&apos;ll appear here once approved.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (rating === 0) {
          setError("Pick a rating from 1 to 5.");
          return;
        }
        setError("");
        setPending(true);
        const result = await submitReview(productId, { rating, title, comment });
        setPending(false);
        if (result.ok) {
          setDone(true);
        } else {
          setError(result.error ?? "Something went wrong. Please try again.");
        }
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4"
    >
      <p className="text-sm font-medium">Write a review</p>
      <StarRating rating={rating} interactive onChange={setRating} size="lg" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className={inputClass}
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts (optional)"
        rows={3}
        className={inputClass}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
