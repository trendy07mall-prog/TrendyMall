import type { Metadata } from "next";
import { getMaintenanceSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "We'll be right back",
  robots: { index: false, follow: false },
};

// Reached via proxy.ts's rewrite (not a real navigation -- the URL bar
// keeps showing whatever page the visitor actually requested), so this
// still renders inside the normal root layout/Navbar/Footer shell. An
// admin never sees this page at all; proxy.ts already excludes them
// before the rewrite happens.
export default async function MaintenancePage() {
  const maintenance = await getMaintenanceSettings();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="font-heading text-2xl font-bold tracking-tight">We&apos;ll be right back</h1>
      <p className="mt-3 text-[var(--muted)]">{maintenance.message}</p>
    </div>
  );
}
