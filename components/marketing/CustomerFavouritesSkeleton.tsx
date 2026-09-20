// Placeholder cards at the EXACT final size, so the section reserves its
// space and nothing below it moves when the real cards arrive. Heights and
// paddings here must track FavouriteProductCard's own.
export function CustomerFavouritesSkeleton() {
  return (
    <section
      aria-hidden="true"
      className="mx-auto w-full max-w-[var(--home-container-width)] px-6 pt-7 pb-6 md:pt-[52px] md:pb-10"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-black/5" />
          <div className="h-7 w-44 animate-pulse rounded bg-black/5 md:h-9" />
          <div className="hidden h-4 w-64 animate-pulse rounded bg-black/5 md:block" />
        </div>
        <div className="h-11 w-28 animate-pulse rounded bg-black/5" />
      </div>

      <ul className="-mx-6 mt-[18px] flex gap-3 overflow-hidden px-6 md:mx-0 md:mt-7 md:gap-7 md:px-0">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="w-[min(312px,82vw)] shrink-0 md:w-[calc((100%-28px)/2)] xl:w-[calc((100%-56px)/3)]"
          >
            <div className="h-[264px] w-full animate-pulse rounded-xl bg-[#F3F4F6] md:h-[292px]" />
          </li>
        ))}
      </ul>
    </section>
  );
}
