import { getHomepageSettings } from "@/lib/data/settings";
import { getAdminHeroSlides } from "@/lib/admin/hero-slides-query";
import { HomepageSettingsForm } from "@/components/admin/settings/HomepageSettingsForm";
import { HeroSlideManager } from "@/components/admin/HeroSlideManager";

export default async function SettingsHomepagePage() {
  const [homepage, slides] = await Promise.all([getHomepageSettings(), getAdminHeroSlides()]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-lg font-semibold">Homepage</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Controls the real hero carousel at the top of the homepage — every setting below maps to a real
          parameter of the existing, tuned carousel component.
        </p>
        <div className="mt-6">
          <HomepageSettingsForm initial={homepage} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-8">
        <h2 className="text-lg font-semibold">Hero Slides</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage the images shown in the homepage hero carousel. Only published slides within their
          start/end dates (if set) appear live.
        </p>
        <div className="mt-6">
          <HeroSlideManager slides={slides} />
        </div>
      </div>
    </div>
  );
}
