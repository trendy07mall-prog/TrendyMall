import type { CSSProperties } from "react";
import type { Category } from "@/types";
import { CategoryCard } from "@/components/marketing/CategoryCard";

// Fewer than this and a loop would show the same category twice side by
// side on desktop, so the row just sits still instead.
const MIN_TO_LOOP = 6;

// Homepage "Explore by Category" row: a slow, continuous left-to-right
// glide. Pure CSS (globals.css, .category-marquee) -- no JS timer.
//
// The list is rendered twice and the track slides by exactly half its own
// width, so the second copy lands where the first started and the loop has
// no visible seam. Every item carries its gap as margin-right (not flex
// gap) to keep the two halves exactly equal. Widths use the clip's
// container width (cqw), so 2 / 3 / 4 / 5 cards fit whole at each
// breakpoint. The copy is aria-hidden and its links are out of the tab
// order, so screen readers and the Tab key meet each category once. It
// is deliberately NOT inert: inert also blocks the mouse, so half the
// cards on screen at any moment ignored hover and clicks.
export function CategoryMarquee({ categories }: { categories: Category[] }) {
  const loop = categories.length >= MIN_TO_LOOP;
  const items = loop ? [...categories, ...categories] : categories;

  return (
    <div className="category-marquee @container -my-4 overflow-hidden py-4" data-loop={loop || undefined}>
      <ul
        aria-label="Categories"
        className="category-marquee-track flex w-max"
        // About 6.5s per category keeps the speed the same however many
        // categories there are.
        style={{ "--marquee-duration": `${categories.length * 6.5}s` } as CSSProperties}
      >
        {items.map((category, index) => {
          const copy = index >= categories.length;
          return (
            <li
              key={copy ? `${category.id}-copy` : category.id}
              aria-hidden={copy || undefined}
              data-copy={copy || undefined}
              className="mr-3 w-[calc((100cqw-0.75rem)/2)] shrink-0 sm:mr-5 sm:w-[calc((100cqw-2.5rem)/3)] md:w-[calc((100cqw-3.75rem)/4)] lg:w-[calc((100cqw-5rem)/5)]"
            >
              <CategoryCard category={category} tabIndex={copy ? -1 : undefined} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
