import { Phone } from "lucide-react";
import { WhatsAppIcon, MailIcon, MapPinIcon, FacebookIcon, InstagramIcon } from "@/components/ui/Icon";
import { FadeIn } from "@/components/motion/FadeIn";
import { getWhatsAppUrl } from "@/lib/site";
import type { GeneralSettings, SocialSettings } from "@/lib/data/settings";

// Same phone/WhatsApp display formatting Footer.tsx and app/contact/page.tsx
// already use ("94775312484" -> "077 531 2484") -- one convention, not a
// second one invented for this page.
function formatLocalNumber(raw: string): string {
  return raw.replace(/^94/, "0").replace(/^\+94/, "0").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
}

export function AboutContact({ general, social }: { general: GeneralSettings; social: SocialSettings }) {
  const whatsappUrl = getWhatsAppUrl(undefined, general.whatsappNumber);
  const whatsappDisplay = formatLocalNumber(general.whatsappNumber);
  const phoneDisplay = formatLocalNumber(general.phone);

  const socialLinks = [
    social.facebookUrl ? { url: social.facebookUrl, icon: FacebookIcon, label: "Facebook" } : null,
    social.instagramUrl ? { url: social.instagramUrl, icon: InstagramIcon, label: "Instagram" } : null,
  ].filter((entry): entry is { url: string; icon: typeof FacebookIcon; label: string } => entry != null);

  return (
    <section className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-14">
      <FadeIn>
        <p className="text-center text-sm font-semibold tracking-wide text-[#16A34A] uppercase">
          Location &amp; Contact
        </p>
        <h2 className="font-heading mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Reach us directly
        </h2>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex min-h-11 items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4">
            <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#0F2D52]" />
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Address
              </p>
              <p className="mt-1 text-sm">{general.address}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Physical shop — planned for the future, not yet open.
              </p>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--border-hover)]"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                WhatsApp
              </p>
              <p className="mt-1 text-sm">{whatsappDisplay}</p>
            </div>
          </a>

          <a
            href={`tel:${general.phone}`}
            className="flex min-h-11 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--border-hover)]"
          >
            <Phone className="h-5 w-5 shrink-0 text-[#0F2D52]" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Phone
              </p>
              <p className="mt-1 text-sm">{phoneDisplay}</p>
            </div>
          </a>

          <a
            href={`mailto:${general.email}`}
            className="flex min-h-11 items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--color-card)] p-4 transition-colors hover:border-[var(--border-hover)]"
          >
            <MailIcon className="h-5 w-5 shrink-0 text-[#0F2D52]" />
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                Email
              </p>
              <p className="mt-1 text-sm break-all">{general.email}</p>
            </div>
          </a>
        </div>

        {socialLinks.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            {socialLinks.map(({ url, icon: SocialIcon, label }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`TrendyMall on ${label}`}
                className="transition-brand flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] hover:-translate-y-0.5 hover:bg-black/5"
              >
                <SocialIcon className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </FadeIn>
    </section>
  );
}
