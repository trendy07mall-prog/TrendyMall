"use server";

import { revalidatePath } from "next/cache";
import sanitizeHtml from "sanitize-html";
import { requireAdminClient } from "@/lib/admin/guard";
import type { PoliciesSettings } from "@/lib/data/settings";

export type SettingType = "string" | "number" | "boolean" | "json" | "image" | "color";

export interface SettingUpdate {
  key: string;
  value: unknown;
  type: SettingType;
  group_name: string;
  description?: string;
}

export type UpdateSettingsResult = { error: string } | { error?: undefined };

// One generic upsert reused by every settings group's form (General,
// Branding, Contact, Announcement, and every later-phase group) -- a
// group's Save Changes button sends only the keys it owns, so saving one
// group can never clobber another's values. Every write re-checks admin
// status at the DB layer via requireAdminClient(), same guard every other
// admin mutation in this codebase uses.
export async function updateSettings(updates: SettingUpdate[]): Promise<UpdateSettingsResult> {
  if (updates.length === 0) return {};

  const supabase = await requireAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = updates.map((update) => ({
    key: update.key,
    value: update.value as never,
    type: update.type,
    group_name: update.group_name,
    description: update.description,
    updated_at: new Date().toISOString(),
    updated_by: user?.id ?? null,
  }));

  const { error } = await supabase.from("store_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };

  // Settings affect nearly every storefront route (hours, WhatsApp,
  // announcement bar, logos) plus the admin Settings UI itself -- layout
  // revalidation covers both without needing a per-page list that would
  // drift as new consumers are added in later phases.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings", "layout");

  return {};
}

// Policy bodies are the one settings group storing rich HTML rather than
// plain values, so they get their own save entry point instead of going
// through updateSettings() directly -- sanitization has to happen here,
// server-side, since a client can call a Server Action directly with
// arbitrary form data regardless of what the browser's editor UI produced.
// Same allowlist reasoning as lib/admin/products.ts's
// DESCRIPTION_SANITIZE_OPTIONS (sanitize-html, not isomorphic-dompurify,
// which needs jsdom and breaks Vercel's serverless bundling), plus `a` --
// policy content (unlike product descriptions) legitimately needs links
// (Terms' cross-links to /shipping and /returns, admin-added links to
// external policy references, etc.). `allowedSchemes` only restricts
// scheme-prefixed URLs (blocks `javascript:`/`data:`); relative internal
// links like "/shipping" are untouched by it.
const POLICY_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "s", "code", "pre", "blockquote", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "img", "a",
  ],
  allowedAttributes: { img: ["src", "alt"], a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https"],
};

export async function savePoliciesSettings(policies: PoliciesSettings): Promise<UpdateSettingsResult> {
  return updateSettings([
    {
      key: "policies.shipping_body",
      value: sanitizeHtml(policies.shippingBody, POLICY_SANITIZE_OPTIONS),
      type: "string",
      group_name: "policies",
    },
    {
      key: "policies.returns_body",
      value: sanitizeHtml(policies.returnsBody, POLICY_SANITIZE_OPTIONS),
      type: "string",
      group_name: "policies",
    },
    {
      key: "policies.privacy_body",
      value: sanitizeHtml(policies.privacyBody, POLICY_SANITIZE_OPTIONS),
      type: "string",
      group_name: "policies",
    },
    {
      key: "policies.terms_body",
      value: sanitizeHtml(policies.termsBody, POLICY_SANITIZE_OPTIONS),
      type: "string",
      group_name: "policies",
    },
    {
      key: "policies.warranty_body",
      value: sanitizeHtml(policies.warrantyBody, POLICY_SANITIZE_OPTIONS),
      type: "string",
      group_name: "policies",
    },
  ]);
}
