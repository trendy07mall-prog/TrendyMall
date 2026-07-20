"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col items-center gap-10 px-6 py-16 sm:min-h-[85vh] lg:flex-row lg:gap-16 lg:py-24">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-1 flex-col items-start text-left"
      >
        <h1 className="font-heading text-[38px] leading-[1.05] font-extrabold tracking-tight sm:text-[42px] lg:text-[60px]">
          Premium Mobile Accessories.
          <br />
          Built for Everyday Performance.
        </h1>
        <p className="mt-6 max-w-lg text-base text-[var(--muted)] sm:text-lg">
          Discover high-quality mobile accessories designed for performance,
          protection, and style. Fast islandwide delivery across Sri Lanka.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/shop"
            className="rounded-full bg-[var(--foreground)] px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            Shop Now
          </Link>
          <a
            href="#categories"
            className="rounded-full border border-[var(--border)] px-7 py-3.5 text-sm font-medium transition-transform hover:scale-[1.03]"
          >
            Browse Categories
          </a>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        className="relative aspect-square w-full max-w-md flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-black/5"
      >
        <Image
          src="/images/earbuds-airpods-pro-2/1.jpg"
          alt="TrendyMall mobile accessories"
          fill
          priority
          sizes="(max-width: 1024px) 90vw, 480px"
          className="object-cover"
        />
      </motion.div>
    </section>
  );
}
