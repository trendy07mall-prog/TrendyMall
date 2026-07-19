import Link from "next/link";
import { getCategories } from "@/lib/data/categories";

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-black px-6 py-20 text-center dark:border-white">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          TrendyMall
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
          Mobile phone accessories, done simply. Earbuds, speakers, power
          banks, and headphones.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-px bg-black sm:my-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 dark:bg-white">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="group flex flex-col items-center justify-center gap-2 bg-white px-6 py-16 text-center transition-colors hover:bg-black hover:text-white dark:bg-black dark:hover:bg-white dark:hover:text-black"
          >
            <span className="text-lg font-medium">{category.name}</span>
            {category.description && (
              <span className="text-sm text-zinc-500 group-hover:text-zinc-300 dark:group-hover:text-zinc-700">
                {category.description}
              </span>
            )}
          </Link>
        ))}
      </section>
    </div>
  );
}
