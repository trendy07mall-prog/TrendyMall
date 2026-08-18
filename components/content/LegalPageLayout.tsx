import { Breadcrumbs, type Crumb } from "@/components/product/Breadcrumbs";
import { PageHero } from "@/components/content/PageHero";
import { PolicyToc } from "@/components/content/PolicyToc";
import type { PolicyTocEntry } from "@/lib/policy-toc";

function formatLastUpdated(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Shared shell for /privacy and /terms -- deliberately restrained
// compared to the Group A pages (Shipping/Returns/Warranty/FAQ): no
// icons, no cards, no CTAs wrapping the legal text itself. Only a
// consistent hero band (for the "feels like the same site" requirement),
// a sticky table-of-contents sidebar, and better typography via
// .legal-policy-body. The actual policy content (`html`, already
// TOC-annotated by lib/policy-toc.ts) is untouched prose -- this
// component never reformats, shortens, or rewords it.
export function LegalPageLayout({
  breadcrumbLabel,
  title,
  lastUpdated,
  toc,
  html,
  children,
}: {
  breadcrumbLabel: string;
  title: string;
  lastUpdated: string | null;
  toc: PolicyTocEntry[];
  html: string;
  children?: React.ReactNode;
}) {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }, { label: breadcrumbLabel }];
  const lastUpdatedLabel = formatLastUpdated(lastUpdated);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 pt-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <PageHero
        eyebrow="Legal"
        title={title}
        subtitle={lastUpdatedLabel ? `Last updated: ${lastUpdatedLabel}` : undefined}
      />

      <div className="mx-auto w-full max-w-[var(--container-width)] px-6 py-[var(--section-padding-y)] max-sm:py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
          <PolicyToc toc={toc} />
          <div className="min-w-0 flex-1">
            <div className="legal-policy-body prose-editor text-sm text-[var(--foreground)]" dangerouslySetInnerHTML={{ __html: html }} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
