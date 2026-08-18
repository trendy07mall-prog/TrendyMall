import "server-only";

export interface PolicyTocEntry {
  id: string;
  label: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

// The raw regex-captured heading text is still HTML-entity-encoded (e.g.
// "Products &amp; Pricing") -- correct when it stays inside the
// dangerouslySetInnerHTML'd markup (the browser decodes it during HTML
// parsing), but wrong for `toc[].label`, which React renders as plain
// text and never decodes a second time. Decoded once, here, specifically
// for the TOC's own display string; the h2 tag re-inserted into `html`
// keeps the original (still-encoded) text so the real content render is
// unaffected.
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

// Pulls a table of contents out of a policy's admin-authored HTML (every
// <h2> becomes an entry) and returns the SAME html with id="..." attributes
// injected into those h2 tags, so the TOC's anchor links (#slug) actually
// land somewhere. Regex-based rather than a full HTML parser: this
// content is sanitized server-side at save time (POLICY_SANITIZE_OPTIONS,
// lib/admin/settings.ts) and, per the Tiptap editor's actual output,
// headings are plain text with no nested markup -- a real parser would be
// overkill for that shape. If a future edit ever produces a heading with
// nested tags, the regex simply won't match it and that heading is
// omitted from the TOC (graceful degradation, not a crash).
export function extractTocAndAnnotateHtml(html: string): { html: string; toc: PolicyTocEntry[] } {
  const toc: PolicyTocEntry[] = [];
  const seenSlugs = new Set<string>();

  const annotated = html.replace(/<h2>([^<]*)<\/h2>/g, (match, rawLabel: string) => {
    const encodedLabel = rawLabel.trim();
    if (!encodedLabel) return match;
    const decodedLabel = decodeHtmlEntities(encodedLabel);

    // Slugify the DECODED text -- slugifying the still-encoded string
    // would leave entity fragments like "amp" as stray words in the id
    // (e.g. "delivery-amp-shipping" instead of "delivery-shipping").
    let slug = slugify(decodedLabel) || "section";
    let unique = slug;
    let suffix = 2;
    while (seenSlugs.has(unique)) {
      unique = `${slug}-${suffix}`;
      suffix += 1;
    }
    seenSlugs.add(unique);
    slug = unique;

    toc.push({ id: slug, label: decodedLabel });
    return `<h2 id="${slug}">${encodedLabel}</h2>`;
  });

  return { html: annotated, toc };
}
