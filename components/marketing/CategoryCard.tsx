import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/types";

// Compact horizontal treatment — a square thumbnail beside the name.
// Frosted "liquid glass" surface (translucent white, backdrop blur, a
// bright top edge) in the brand navy, with the orange "Shop now" line as
// the one highlight. Over the plain page background the glass reads as a
// soft white card, so it sits just as well in the About and sub-category
// grids as in the homepage marquee. alt="" here (not category.name) since
// the adjacent heading already conveys the name — the image is redundant
// decoration once paired with visible text, so it shouldn't be announced
// twice.
export function CategoryCard({ category, tabIndex }: { category: Category; tabIndex?: number }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      tabIndex={tabIndex}
      className="group flex h-[88px] items-center gap-2.5 rounded-[18px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.38))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(15,45,82,0.06),0_8px_24px_rgba(15,45,82,0.12)] backdrop-blur-[18px] backdrop-saturate-[1.8] transition-[translate,box-shadow] duration-200 ease-in-out hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_0_0_1.5px_rgba(249,115,22,0.55),0_16px_36px_rgba(15,45,82,0.18)] sm:h-[104px] sm:gap-3.5 sm:rounded-[20px] sm:p-3.5"
    >
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] border border-white/90 bg-white/85 shadow-[0_2px_8px_rgba(15,45,82,0.08)] sm:h-[72px] sm:w-[72px] sm:rounded-[14px]">
        {category.image_path ? (
          <Image
            src={category.image_path}
            alt=""
            fill
            loading="lazy"
            sizes="72px"
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <span
            aria-hidden="true"
            className="font-heading flex h-full w-full items-center justify-center text-xl font-extrabold text-[#0F2D52]/15"
          >
            {category.name.charAt(0)}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
        <h3 className="font-heading line-clamp-2 text-[13px] leading-[1.3] font-bold text-[#0F2D52] sm:text-[15px]">
          {category.name}
        </h3>
        {/* #C2410C rather than brand orange #F97316: the same hue, dark
            enough for small text to pass 4.5:1 on the white glass. */}
        <span className="text-[11px] font-semibold text-[#C2410C] sm:text-xs">Shop now →</span>
      </span>
    </Link>
  );
}
