"use client";

import { StarIcon } from "@/components/ui/Icon";

const SIZE_CLASSES = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

const STARS = [1, 2, 3, 4, 5];

export function StarRating({
  rating,
  size = "md",
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (interactive) {
    return (
      <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
        {STARS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === Math.round(rating)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            onClick={() => onChange?.(star)}
            className="text-yellow-500"
          >
            <StarIcon filled={star <= Math.round(rating)} className={sizeClass} />
          </button>
        ))}
      </div>
    );
  }

  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));

  return (
    <div className="relative inline-flex" aria-label={`Rated ${rating} out of 5`}>
      <div className="flex gap-0.5 text-[var(--border)]">
        {STARS.map((star) => (
          <StarIcon key={star} className={sizeClass} />
        ))}
      </div>
      <div
        className="absolute inset-0 flex gap-0.5 overflow-hidden text-yellow-500"
        style={{ width: `${percent}%` }}
      >
        {STARS.map((star) => (
          <StarIcon key={star} filled className={sizeClass} />
        ))}
      </div>
    </div>
  );
}
