import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/profile";
import { getMyAddresses } from "@/lib/addresses";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { PreferencesForm } from "@/components/account/PreferencesForm";

export const metadata: Metadata = { title: "Settings — TrendyMall" };

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    profile,
    addresses,
  ] = await Promise.all([supabase.auth.getUser(), getMyProfile(), getMyAddresses()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Manage your profile, security, and preferences.</p>
      </div>

      <SettingsSection title="Profile">
        <p className="text-sm">{profile?.full_name || "—"}</p>
        <p className="text-sm text-[var(--muted)]">{user?.email}</p>
        {profile?.phone && <p className="text-sm text-[var(--muted)]">{profile.phone}</p>}
        <Link
          href="/account/profile"
          className="transition-brand mt-3 inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
        >
          Edit profile
        </Link>
      </SettingsSection>

      <SettingsSection title="Password">
        <ChangePasswordForm />
      </SettingsSection>

      <SettingsSection title="Addresses">
        <p className="text-sm text-[var(--muted)]">
          {addresses.length} saved address{addresses.length === 1 ? "" : "es"}
        </p>
        <Link
          href="/account/addresses"
          className="transition-brand mt-3 inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-4 text-sm font-medium hover:bg-black/5"
        >
          Manage addresses
        </Link>
      </SettingsSection>

      <SettingsSection title="Notifications">
        <PreferencesForm profile={profile} />
      </SettingsSection>

      <SettingsSection title="Privacy">
        <p className="text-sm text-[var(--muted)]">
          Read how we handle your data in our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </SettingsSection>
    </div>
  );
}
