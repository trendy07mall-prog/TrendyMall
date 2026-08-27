"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveHeroSlide } from "@/lib/admin/hero-slides";
import { utcIsoToSriLankaInputValue } from "@/lib/campaign-datetime";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import type { AdminHeroSlide } from "@/lib/admin/hero-slides-query";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

export function HeroSlideForm({
  initial,
  onSaved,
}: {
  initial: AdminHeroSlide | null;
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveHeroSlide, undefined);

  // Same stale-closure fix as CampaignForm.tsx: a plain post-submit
  // callback can't distinguish success from failure in the same tick, so
  // this waits for the real post-submit `state` before closing the form.
  const submittedRef = useRef(false);
  useEffect(() => {
    if (submittedRef.current && !state?.error) {
      submittedRef.current = false;
      onSaved?.();
    }
  }, [state, onSaved]);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [buttonText, setButtonText] = useState(initial?.button_text ?? "");
  const [buttonLink, setButtonLink] = useState(initial?.button_link ?? "");
  const [desktopImageUrl, setDesktopImageUrl] = useState(initial?.desktop_image_url ?? null);
  const [mobileImageUrl, setMobileImageUrl] = useState(initial?.mobile_image_url ?? null);
  const [startAt, setStartAt] = useState(utcIsoToSriLankaInputValue(initial?.start_at ?? null));
  const [endAt, setEndAt] = useState(utcIsoToSriLankaInputValue(initial?.end_at ?? null));

  return (
    <form
      action={(formData) => {
        submittedRef.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="id" defaultValue={initial?.id ?? ""} />
      <input type="hidden" name="desktopImageUrl" value={desktopImageUrl ?? ""} />
      <input type="hidden" name="mobileImageUrl" value={mobileImageUrl ?? ""} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Title</label>
        <input
          type="text"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-[var(--muted)]">
          Accessibility text for the image, and the overlay heading if a subtitle or button is set.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SingleImageUploader
          label="Desktop image"
          name="desktopImageUploader"
          value={desktopImageUrl}
          onChange={setDesktopImageUrl}
          prefix="hero"
          hint="Wide aspect ratio, shown at 768px and up."
        />
        <SingleImageUploader
          label="Mobile image"
          name="mobileImageUploader"
          value={mobileImageUrl}
          onChange={setMobileImageUrl}
          prefix="hero"
          hint="16:9 crop, shown below 768px."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Subtitle (optional)</label>
        <input
          type="text"
          name="subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Button text (optional)</label>
          <input
            type="text"
            name="buttonText"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Button link (optional)</label>
          <input
            type="text"
            name="buttonLink"
            placeholder="/shop or https://..."
            value={buttonLink}
            onChange={(e) => setButtonLink(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Subtitle/button text only appear as an overlay on the image when at least one is set — leave both
        blank for a plain image slide. The whole slide links to Button link when set (button text is
        optional decoration, not a separate click target).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Start date/time (optional)</label>
          <DateTimePicker
            mode="datetime"
            name="startAt"
            value={startAt}
            onChange={setStartAt}
            placeholder="No start date"
            aria-label="Slide start date and time"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">End date/time (optional)</label>
          <DateTimePicker
            mode="datetime"
            name="endAt"
            value={endAt}
            onChange={setEndAt}
            placeholder="No end date"
            aria-label="Slide end date and time"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          name="status"
          value="draft"
          disabled={pending}
          className="transition-brand rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save as Draft"}
        </button>
        <button
          type="submit"
          name="status"
          value="published"
          disabled={pending}
          className="transition-brand rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-btn-hover)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
