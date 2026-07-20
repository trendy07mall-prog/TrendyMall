import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-black/5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
    >
      {category.image_path ? (
        <Image
          src={category.image_path}
          alt={category.name}
          fill
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span
          aria-hidden="true"
          className="font-heading absolute top-6 left-6 text-5xl font-extrabold text-black/10"
        >
          {category.name.charAt(0)}
        </span>
      )}
      <div className="relative bg-gradient-to-t from-white via-white/90 to-transparent p-6">
        <h3 className="font-heading text-lg font-bold">{category.name}</h3>
        {category.description && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
}
