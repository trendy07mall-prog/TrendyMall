import { getWhatsAppUrl } from "@/lib/site";
import type { GeneralSettings } from "@/lib/data/settings";

// Shared "Contact Us" closer for Privacy/Terms/Returns/Warranty
// (app/*/page.tsx) -- deliberately real JSX, not part of any policy's
// admin-editable rich-text body, so the email/WhatsApp link can never go
// stale the way admin-typed contact info could.
export function PolicyContactBlock({ general }: { general: GeneralSettings }) {
  return (
    <>
      <h2 className="font-heading mt-4 text-lg font-bold">Contact Us</h2>
      <p>
        Questions? Reach us via{" "}
        <a href={getWhatsAppUrl(undefined, general.whatsappNumber)} className="underline">
          WhatsApp
        </a>{" "}
        or{" "}
        <a href={`mailto:${general.email}`} className="underline">
          {general.email}
        </a>
        .
      </p>
    </>
  );
}
