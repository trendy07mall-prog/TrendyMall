import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";

// Compact horizontal treatment — a small square thumbnail beside the
// name, not the old full-bleed vertical card, to cut the section's
// height while staying legible at the smaller carousel-item width mobile
// uses. alt="" here (not category.name) since the adjacent heading
// already conveys the name — the image is redundant decoration once
// paired with visible text, so it shouldn't be announced twice.
export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex h-full items-center gap-3 rounded-[16px] border border-[var(--border)] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-in-out hover:-translate-y-1"
    >
      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-black/5">
        {category.image_path ? (
          <Image
            src={category.image_path}
            alt=""
            fill
            loading="lazy"
            sizes="64px"
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-heading flex h-full w-full items-center justify-center text-xl font-extrabold text-black/10"
          >
            {category.name.charAt(0)}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <h3 className="truncate font-heading text-sm font-bold">{category.name}</h3>
        {category.description && (
          <p className="truncate text-xs text-[var(--muted)]">{category.description}</p>
        )}
      </span>
    </Link>
  );
}
