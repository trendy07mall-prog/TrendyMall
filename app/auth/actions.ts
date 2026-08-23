"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/utils";

export type AuthFormState = { error: string } | undefined;

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Honeypot, same pattern as lib/contact.ts's "company" field — a real
  // visitor never sees or fills it (SignupForm.tsx). A bot that does gets
  // routed to the same success redirect as a real signup, so detection is
  // never revealed — no Supabase signUp() call happens, so no email is
  // sent and no bounce risk from this path.
  const honeypot = String(formData.get("company") ?? "").trim();
  if (honeypot) redirect("/login?confirmEmail=1");

  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // A real format check before Supabase's signUp() ever fires — this is
  // the actual bounce-rate fix: "a@", "@@", etc. used to sail through
  // straight to a genuine confirmation-email send that was guaranteed to
  // bounce. Client-side SignupForm.tsx already blocks these too, but that
  // can always be bypassed by posting to this action directly.
  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  // IP-based, same lib/rate-limit.ts helper and shape the contact form
  // already uses — caps how many verification emails one visitor can
  // trigger regardless of how many distinct (fake or real) addresses they
  // try, which a per-address check alone can't do.
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
  const allowed = checkRateLimit(`signup:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?confirmEmail=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export type ChangePasswordFormState = { error: string; success?: undefined } | { success: true; error?: undefined } | undefined;

// New capability, not a change to how login/signup/registration work --
// operates on the caller's own already-authenticated session via
// Supabase's standard auth.updateUser, the same client every other action
// in this file already uses. No forgot-password/reset-token flow exists
// (confirmed by audit) -- this only covers "change my password while
// logged in," which is all Settings needs.
export async function changePassword(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
