"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { savePoliciesSettings } from "@/lib/admin/settings";
import { useUnsavedChangesGuard } from "@/components/admin/settings/useUnsavedChangesGuard";
import { SaveBar, type SaveStatus } from "@/components/admin/settings/SaveBar";
import type { PoliciesSettings } from "@/lib/data/settings";

// Same lazy-load pattern as ProductForm.tsx -- Tiptap touches the DOM on
// init and can't run during SSR.
const RichTextEditor = dynamic(
  () => import("@/components/admin/product-form/RichTextEditor").then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-[var(--radius-sm)] bg-black/5" /> },
);

const SECTIONS: { key: keyof PoliciesSettings; label: string; hint: string }[] = [
  {
    key: "shippingBody",
    label: "Shipping Policy",
    hint: "Shown at /shipping. The real delivery-zone rate table (from Shipping settings) renders automatically after this text -- no need to restate the rates here.",
  },
  { key: "returnsBody", label: "Returns & Refunds Policy", hint: "Shown at /returns." },
  {
    key: "privacyBody",
    label: "Privacy Policy",
    hint: "Shown at /privacy. A live Contact Us block (your real email/WhatsApp) renders automatically after this text.",
  },
  {
    key: "termsBody",
    label: "Terms & Conditions",
    hint: "Shown at /terms. A live Contact Us block (your real email/WhatsApp) renders automatically after this text.",
  },
  {
    key: "warrantyBody",
    label: "Warranty",
    hint: "Shown at /warranty. A live Contact Us block renders automatically after this text.",
  },
];

export function PoliciesSettingsForm({ initial }: { initial: PoliciesSettings }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);
  useUnsavedChangesGuard(isDirty);

  function set(key: keyof PoliciesSettings, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    const result = await savePoliciesSettings(values);
    if (result.error) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }
    setStatus("saved");
  }

  return (
    <div className="flex flex-col gap-8">
      {SECTIONS.map((section) => (
        <div key={section.key} className="flex flex-col gap-2">
          <div>
            <h3 className="text-sm font-semibold">{section.label}</h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{section.hint}</p>
          </div>
          <RichTextEditor label="" value={values[section.key]} onChange={(html) => set(section.key, html)} />
        </div>
      ))}

      <SaveBar status={status} errorMessage={errorMessage} isDirty={isDirty} onSave={handleSave} />
    </div>
  );
}
