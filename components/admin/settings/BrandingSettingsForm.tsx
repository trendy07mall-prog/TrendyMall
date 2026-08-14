"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import type { BrandingSettings } from "@/lib/data/settings";

const COLOR_FIELDS: { key: keyof Pick<BrandingSettings, "colorPrimary" | "colorAccent" | "colorSuccess">; label: string }[] = [
  { key: "colorPrimary", label: "Brand Primary" },
  { key: "colorAccent", label: "Brand Accent" },
  { key: "colorSuccess", label: "Success" },
];

export function BrandingSettingsForm({ initial }: { initial: BrandingSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      {
        key: "branding.logo_desktop_url",
        value: values.logoDesktopUrl,
        type: "image",
        group_name: "branding",
      },
      {
        key: "branding.logo_mobile_url",
        value: values.logoMobileUrl,
        type: "image",
        group_name: "branding",
      },
      { key: "branding.favicon_url", value: values.faviconUrl, type: "image", group_name: "branding" },
      {
        key: "branding.admin_logo_url",
        value: values.adminLogoUrl,
        type: "image",
        group_name: "branding",
      },
      {
        key: "branding.color_primary",
        value: values.colorPrimary,
        type: "color",
        group_name: "branding",
      },
      { key: "branding.color_accent", value: values.colorAccent, type: "color", group_name: "branding" },
      {
        key: "branding.color_success",
        value: values.colorSuccess,
        type: "color",
        group_name: "branding",
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
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SingleImageUploader
          label="Desktop logo"
          name="logoDesktopUrl"
          value={values.logoDesktopUrl}
          onChange={(url) => set("logoDesktopUrl", url ?? "")}
          prefix="settings"
        />
        <SingleImageUploader
          label="Mobile logo"
          name="logoMobileUrl"
          value={values.logoMobileUrl}
          onChange={(url) => set("logoMobileUrl", url ?? "")}
          prefix="settings"
        />
        <SingleImageUploader
          label="Favicon"
          name="faviconUrl"
          value={values.faviconUrl}
          onChange={(url) => set("faviconUrl", url ?? "")}
          hint="Square image, used for the browser tab icon."
          prefix="settings"
        />
        <SingleImageUploader
          label="Admin sidebar logo"
          name="adminLogoUrl"
          value={values.adminLogoUrl}
          onChange={(url) => set("adminLogoUrl", url ?? "")}
          prefix="settings"
        />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Brand colors</label>
          <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
            Reference only
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          These record the site&apos;s current brand colors for reference — they don&apos;t change
          the live site yet. We&apos;ve had real accessibility contrast issues before, so live
          color editing is held back until a contrast check is built.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COLOR_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-sm font-medium">{field.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={values[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent p-1"
                />
                <input
                  type="text"
                  value={values[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
