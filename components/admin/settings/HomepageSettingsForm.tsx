"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { StatusIndicator } from "@/components/admin/settings/StatusIndicator";
import type { HomepageSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <StatusIndicator active={checked} />
        <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-black/15 transition-colors peer-checked:bg-[var(--color-success)]" />
          <span className="relative h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
        </label>
      </div>
    </div>
  );
}

// Controls the EXISTING hero carousel (components/marketing/HeroSlider.tsx
// + SlideCarousel.tsx) -- every field here maps to a real prop that
// component now accepts (confirmed during Phase 2 planning), not a
// settings UI implying control over something that doesn't exist.
export function HomepageSettingsForm({ initial }: { initial: HomepageSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof HomepageSettings>(key: K, value: HomepageSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      {
        key: "homepage.hero_enabled",
        value: values.heroEnabled,
        type: "boolean",
        group_name: "homepage",
      },
      {
        key: "homepage.hero_autoplay",
        value: values.heroAutoplay,
        type: "boolean",
        group_name: "homepage",
      },
      {
        key: "homepage.hero_slide_duration_ms",
        value: values.heroSlideDurationMs,
        type: "number",
        group_name: "homepage",
      },
      {
        key: "homepage.hero_show_arrows",
        value: values.heroShowArrows,
        type: "boolean",
        group_name: "homepage",
      },
      {
        key: "homepage.hero_show_dots",
        value: values.heroShowDots,
        type: "boolean",
        group_name: "homepage",
      },
    ]);
    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setStatus("saved");
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleRow
        label="Hero carousel"
        hint="Show the image carousel at the top of the homepage."
        checked={values.heroEnabled}
        onChange={(checked) => set("heroEnabled", checked)}
      />
      <ToggleRow
        label="Autoplay"
        hint="Auto-advance slides. Always off when the visitor's device requests reduced motion, regardless of this setting."
        checked={values.heroAutoplay}
        onChange={(checked) => set("heroAutoplay", checked)}
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Slide duration (seconds)</label>
        <input
          type="number"
          min={1}
          step={0.5}
          value={values.heroSlideDurationMs / 1000}
          onChange={(e) => set("heroSlideDurationMs", Math.round(Number(e.target.value) * 1000))}
          disabled={!values.heroAutoplay}
          className={`${inputClass} max-w-40 disabled:opacity-40`}
        />
      </div>
      <ToggleRow
        label="Arrows"
        hint="Show the prev/next arrow buttons. Only appears with 2+ published slides regardless of this setting."
        checked={values.heroShowArrows}
        onChange={(checked) => set("heroShowArrows", checked)}
      />
      <ToggleRow
        label="Dots"
        hint="Show the slide indicator dots. Only appears with 2+ published slides regardless of this setting."
        checked={values.heroShowDots}
        onChange={(checked) => set("heroShowDots", checked)}
      />

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
