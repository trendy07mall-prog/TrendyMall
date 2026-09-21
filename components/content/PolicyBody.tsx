import { PageShell } from "@/components/content/PageShell";
import { optimizeRichTextImages } from "@/lib/rich-text";

// Shared shell for every policy page (Shipping/Returns/Privacy/Terms/
// Warranty, Phase 4) -- `html` is the admin-editable body, sanitized
// server-side (sanitize-html) before it was ever stored, same trust
// boundary as product descriptions (components/product/ProductTabs.tsx).
// `children` is for content that must stay live rather than admin-typed
// (Shipping's delivery-zone rate table, the Contact Us block), rendered
// after the editable body.
export function PolicyBody({
  title,
  html,
  children,
}: {
  title: string;
  html: string;
  children?: React.ReactNode;
}) {
  return (
    <PageShell title={title}>
      {/* Rewritten here rather than at each call site so a policy page
          that gains an image later cannot quietly reintroduce the
          full-resolution decode this fixed -- see lib/rich-text.ts. */}
      <div className="prose-editor" dangerouslySetInnerHTML={{ __html: optimizeRichTextImages(html) }} />
      {children}
    </PageShell>
  );
}
