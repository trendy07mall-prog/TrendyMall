import { SettingsSidebar } from "@/components/admin/settings/SettingsSidebar";

export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-tight">Store Settings</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        The single source of truth for store-wide configuration — changes here update the live
        site.
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <SettingsSidebar />
        <div className="min-w-0 flex-1 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
