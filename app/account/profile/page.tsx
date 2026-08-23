import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile";
import { PersonalInfoForm } from "@/components/account/PersonalInfoForm";
import { AccountAvatar } from "@/components/account/AccountAvatar";

export const metadata: Metadata = { title: "Profile — TrendyMall" };

// Relocated from app/account/page.tsx (now the Overview dashboard) —
// PersonalInfoForm and updatePersonalInfo are byte-for-byte unchanged,
// only the route moved. The avatar block below is a pure presentational
// addition (Phase 3) — this page previously had no visual identity of its
// own, only the sidebar showed one.
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getMyProfile();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Profile</h1>
      <div className="mt-4 flex items-center gap-3">
        <AccountAvatar fullName={profile?.full_name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{profile?.full_name || "Your account"}</p>
          <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
        </div>
      </div>
      <PersonalInfoForm email={user?.email ?? ""} profile={profile} />
    </div>
  );
}
