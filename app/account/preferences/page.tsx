import { redirect } from "next/navigation";

// Orphaned from nav since Phase 1 (never linked) — its content
// (PreferencesForm) now lives inside /account/settings' Notifications
// section instead. Redirecting rather than deleting so no old bookmark
// 404s.
export default function PreferencesRedirectPage() {
  redirect("/account/settings");
}
