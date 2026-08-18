import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/FadeIn";

// Shared hero band for every content page redesigned to match /about's
// visual language (Shipping, Returns, Warranty, FAQ, Privacy, Terms,
// Track Order) -- same gradient/tokens as components/content/about/AboutHero.tsx,
// extracted here since 7 pages need it identically rather than each
// hand-rolling its own copy of it.
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  // Extra content below the subtitle -- e.g. Track Order's centered form,
  // or FAQ's search field. Optional so plain informational pages don't
  // need an empty slot.
  children?: ReactNode;
}) {
  return (
    <section className="bg-gradient-to-br from-[#0F2D52] to-[#173f70] px-6 py-14 text-white sm:py-20">
      <div className="mx-auto flex w-full max-w-[var(--container-width)] flex-col items-center text-center">
        <FadeIn>
          <p className="text-sm font-semibold tracking-wide text-[#4ADE80] uppercase">{eyebrow}</p>
          <h1 className="font-heading mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80 sm:text-base">{subtitle}</p>}
        </FadeIn>
        {children && (
          <FadeIn delay={0.1} className="mt-8 w-full">
            {children}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
