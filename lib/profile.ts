"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidSriLankanPhone } from "@/lib/utils";
import type { Profile } from "@/types";

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export type ProfileFormState = { error: string } | undefined;

export async function updatePersonalInfo(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) return { error: "Name is required." };
  if (phone && !isValidSriLankanPhone(phone)) {
    return { error: "Enter a valid Sri Lankan phone number." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account");
  return undefined;
}

export async function updateNotificationPreference(
  emailNotifications: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications: emailNotifications })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account/preferences");
  return {};
}
