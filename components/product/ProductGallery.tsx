"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CloseIcon } from "@/components/ui/Icon";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const current = images[active];

  useEffect(() => {
    if (!zoomOpen) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setZoomOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [zoomOpen]);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => current && setZoomOpen(true)}
        aria-label="Zoom image"
        className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-[var(--radius-lg)] bg-black/5"
      >
        {current ? (
          <Image
            src={current}
            alt={name}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
            No image
          </div>
        )}
      </button>

      {zoomOpen && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="Close zoomed image"
            className="absolute inset-0 bg-black/80"
            onClick={() => setZoomOpen(false)}
          />
          <button
            type="button"
            aria-label="Close zoomed image"
            onClick={() => setZoomOpen(false)}
            className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <div className="relative h-full w-full max-w-3xl">
            <Image
              src={current}
              alt={name}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative h-16 w-16 overflow-hidden rounded-[var(--radius-sm)] border transition-colors ${
                i === active
                  ? "border-[var(--foreground)]"
                  : "border-[var(--border)]"
              }`}
            >
              <Image
                src={src}
                alt={`${name} — photo ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
