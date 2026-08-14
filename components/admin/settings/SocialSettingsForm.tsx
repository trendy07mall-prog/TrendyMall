"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import type { SocialSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

const FIELDS: { key: keyof SocialSettings; settingKey: string; label: string }[] = [
  { key: "facebookUrl", settingKey: "social.facebook_url", label: "Facebook" },
  { key: "instagramUrl", settingKey: "social.instagram_url", label: "Instagram" },
  { key: "tiktokUrl", settingKey: "social.tiktok_url", label: "TikTok" },
  { key: "youtubeUrl", settingKey: "social.youtube_url", label: "YouTube" },
  { key: "twitterUrl", settingKey: "social.twitter_url", label: "X (Twitter)" },
];

// Empty = that platform's icon simply doesn't render in the footer and
// drops out of the JSON-LD sameAs array -- never an empty-string entry.
export function SocialSettingsForm({ initial }: { initial: SocialSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set(key: keyof SocialSettings, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings(
      FIELDS.map((field) => ({
        key: field.settingKey,
        value: values[field.key],
        type: "string" as const,
        group_name: "social",
      })),
    );
    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setStatus("saved");
  }

  return (
    <div className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-sm font-medium">{field.label}</label>
          <input
            type="url"
            placeholder="https://…"
            value={values[field.key]}
            onChange={(e) => set(field.key, e.target.value)}
            className={inputClass}
          />
        </div>
      ))}
      <span className="text-xs text-[var(--muted)]">Leave a field empty to hide that platform.</span>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
