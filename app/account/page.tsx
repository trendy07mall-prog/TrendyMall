import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile";
import { PersonalInfoForm } from "@/components/account/PersonalInfoForm";

export const metadata: Metadata = { title: "Personal Information — TrendyMall" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getMyProfile();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Personal Information</h1>
      <PersonalInfoForm email={user?.email ?? ""} profile={profile} />
    </div>
  );
}
