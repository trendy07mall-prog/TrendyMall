import { getContactSettings, getGeneralSettings } from "@/lib/data/settings";
import { ContactSettingsForm } from "@/components/admin/settings/ContactSettingsForm";

export default async function SettingsContactPage() {
  const [contact, general] = await Promise.all([getContactSettings(), getGeneralSettings()]);

  return (
    <div>
      <h2 className="text-lg font-semibold">Contact &amp; WhatsApp</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Controls the real floating WhatsApp button. Email, phone, and hours are managed in General
        to avoid a second copy that can drift.
      </p>
      <div className="mt-6">
        <ContactSettingsForm initial={contact} general={general} />
      </div>
    </div>
  );
}
