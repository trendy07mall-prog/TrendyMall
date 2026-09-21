"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/utils";

export type AuthFormState = { error: string } | undefined;

// login and signOut used to live here as Server Actions, but a Server
// Action's auth.signInWithPassword()/signOut() runs against a separate
// server-side Supabase client -- it updates the session cookie, but the
// browser tab's OWN long-lived Supabase client (the one CartContext's
// onAuthStateChange listens to for the guest-cart-merge) never witnesses
// the change, and a Server Action's redirect is a soft client-side
// transition that doesn't force that client to re-check either. That left
// the merge silently never running on login (confirmed via direct
// database checks, not just console noise) and a signed-out tab still
// believing it was signed in. Both now happen client-side instead -- see
// app/login/login-form.tsx and lib/supabase/client-auth.ts.

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Honeypot -- now FAILS OPEN. It logs and falls through to the real
  // signUp() below; it no longer redirects anyone to a fake success.
  //
  // This control has silently destroyed genuine signups twice. First with
  // the field named "company", which browsers autofill from any saved
  // organization value; renaming it to "hp_ref" was supposed to fix that,
  // and did not -- a real customer signing up as lifetimeoffer07@gmail.com
  // was shown "Account created. Check your email" with no account ever
  // created and no email ever sent (confirmed against auth.users). The
  // field's POSITION was the real attractor: it sat first in the form, and
  // password managers fill the first text input with a saved username or
  // e-mail regardless of autocomplete="off". It has been moved to the end
  // of the form as well (SignupForm.tsx).
  //
  // A silently-faked success costs a real customer their account and
  // leaves them believing they have one. That is far worse than the spam
  // this was filtering, particularly since signup is already protected by
  // the e-mail format check below, an IP rate limit, and Supabase's own
  // limits. So a filled honeypot is now only a signal to review in the
  // logs, never a reason to turn a genuine customer away.
  const honeypot = String(formData.get("hp_ref") ?? "").trim();
  if (honeypot) {
    console.warn("[signup] honeypot field was filled -- proceeding anyway", {
      email: String(formData.get("email") ?? ""),
    });
  }

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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  // Supabase deliberately hides "this e-mail is already registered": it
  // returns NO error and a user object that looks like a fresh signup, so
  // an attacker can't probe this form to learn who has an account. The one
  // tell is an EMPTY identities array (a genuine new signup always has
  // one), and no confirmation e-mail is sent in that case.
  //
  // Without this check the customer was sent to "Account created. Check
  // your email" and then waited for a message that was never coming --
  // the same dead end the honeypot used to produce. Told plainly instead,
  // at the cost of confirming an address has an account here; a deliberate
  // trade, since the enumeration risk is small for a storefront and the
  // alternative strands real customers.
  if (!error && data.user && (data.user.identities?.length ?? 0) === 0) {
    return {
      error: "That email already has an account. Try logging in instead, or reset your password.",
    };
  }

  if (error) {
    // Supabase does not always hand back a usable message. The auth
    // mailer's 500 ("Error sending confirmation email") arrives through
    // the SDK as the literal string "{}", and that is exactly what was
    // being printed at the customer, under a red error style, as their
    // entire explanation. Anything that is not a real sentence is
    // replaced with a human one and the original logged for us.
    const raw = (error.message ?? "").trim();
    const usable = raw.length > 0 && !/^\{.*\}$/.test(raw);
    if (!usable) {
      console.error("[signup] signUp failed with an unusable message", {
        status: error.status,
        raw,
        email,
      });
      return {
        error:
          "We couldn't create your account just now. Please try again in a few minutes, or contact us if it keeps happening.",
      };
    }
    return { error: raw };
  }

  redirect("/login?confirmEmail=1");
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
