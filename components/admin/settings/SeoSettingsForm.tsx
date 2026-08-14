"use client";

import { useState } from "react";
import { updateSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import { SingleImageUploader } from "@/components/admin/SingleImageUploader";
import type { SeoSettings } from "@/lib/data/settings";

const inputClass =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--foreground)]";

// Only the site-wide fallback layer (homepage + the auto-generated social
// preview image) -- product/category/campaign/order-confirmation pages
// already set their own complete metadata and are never affected by this.
export function SeoSettingsForm({ initial }: { initial: SeoSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set<K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await updateSettings([
      {
        key: "seo.site_title_default",
        value: values.siteTitleDefault,
        type: "string",
        group_name: "seo",
      },
      { key: "seo.title_template", value: values.titleTemplate, type: "string", group_name: "seo" },
      {
        key: "seo.meta_description",
        value: values.metaDescription,
        type: "string",
        group_name: "seo",
      },
      { key: "seo.og_image_url", value: values.ogImageUrl, type: "image", group_name: "seo" },
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
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Default page title</label>
        <input
          type="text"
          value={values.siteTitleDefault}
          onChange={(e) => set("siteTitleDefault", e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-[var(--muted)]">
          Shown for pages that don&apos;t set their own title, like the homepage.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Title template</label>
        <input
          type="text"
          value={values.titleTemplate}
          onChange={(e) => set("titleTemplate", e.target.value)}
          className={`${inputClass} max-w-64`}
        />
        <span className="text-xs text-[var(--muted)]">
          <code>%s</code> is replaced with each page&apos;s own title — e.g. a Shop page titled &quot;Shop
          All Accessories&quot; becomes &quot;Shop All Accessories {values.titleTemplate.replace("%s", "").trim()}&quot;.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Default meta description</label>
        <textarea
          rows={3}
          value={values.metaDescription}
          onChange={(e) => set("metaDescription", e.target.value)}
          className={inputClass}
        />
        <span className="text-xs text-[var(--muted)]">
          Used for the homepage and any page that doesn&apos;t set its own description. Products,
          categories, and campaigns already have their own — unaffected by this.
        </span>
      </div>

      <SingleImageUploader
        label="Social preview image"
        name="ogImageUrl"
        value={values.ogImageUrl || null}
        onChange={(url) => set("ogImageUrl", url ?? "")}
        hint="Shown when the site is shared on Facebook/Twitter/WhatsApp etc. Leave empty to keep using the auto-generated logo card."
        prefix="settings"
      />

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
