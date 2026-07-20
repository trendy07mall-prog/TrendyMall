import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        Not found
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85"
      >
        Back to home
      </Link>
    </div>
  );
}
