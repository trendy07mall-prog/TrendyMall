"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreference } from "@/lib/profile";
import { useToast } from "@/components/ui/ToastProvider";
import type { Profile } from "@/types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  bank_transfer: "Bank Transfer",
  payhere: "Card (PayHere)",
};

export function PreferencesForm({ profile }: { profile: Profile | null }) {
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? true);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleToggle(next: boolean) {
    setEmailNotifications(next);
    startTransition(async () => {
      const result = await updateNotificationPreference(next);
      if (result.error) {
        setEmailNotifications(!next);
        showToast(result.error, { variant: "error" });
      }
    });
  }

  const paymentPreferenceLabel = profile?.preferred_payment_method
    ? (PAYMENT_METHOD_LABELS[profile.preferred_payment_method] ?? profile.preferred_payment_method)
    : "Not set yet — this fills in automatically after your first order.";

  return (
    <div className="mt-6 flex max-w-md flex-col gap-8">
      <div>
        <h2 className="text-lg font-medium">Email Notifications</h2>
        <label className="mt-3 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={emailNotifications}
            disabled={pending}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          Send me order confirmation and status update emails
        </label>
      </div>

      <div>
        <h2 className="text-lg font-medium">Payment Preference</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">{paymentPreferenceLabel}</p>
      </div>
    </div>
  );
}
