import type { Metadata } from "next";
import { getMyProfile } from "@/lib/profile";
import { PreferencesForm } from "@/components/account/PreferencesForm";

export const metadata: Metadata = { title: "Preferences — TrendyMall" };

export default async function PreferencesPage() {
  const profile = await getMyProfile();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Preferences</h1>
      <PreferencesForm profile={profile} />
    </div>
  );
}
