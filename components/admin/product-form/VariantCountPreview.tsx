"use client";

import type { Attribute, AttributeValue } from "@/types";

// Purely a readout of what's already selected above: how many variant rows
// the chosen attribute combinations could fill. It is arithmetic over props
// -- no request, no state, and nothing downstream reads it. Variants are
// still created only from the rows the admin actually adds below.

// "Connectors" is already plural, so "3 connectors" reads correctly, while
// "Storage" needs a noun to count -- "5 storage options".
function describe(count: number, attribute: Attribute): string {
  const name = attribute.name.toLowerCase();
  return count + " " + name + (name.endsWith("s") ? "" : " option" + (count === 1 ? "" : "s"));
}

export function VariantCountPreview({
  variantAttributes,
}: {
  variantAttributes: { attribute: Attribute; values: AttributeValue[] }[];
}) {
  const groups = variantAttributes.filter((g) => g.values.length > 0);
  if (groups.length === 0) return null;

  const total = groups.reduce((product, g) => product * g.values.length, 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-[var(--pf-navy-soft)] px-3.5 py-2.5">
      <p className="text-[13px] text-[var(--pf-navy)]">
        {groups.map((g, i) => (
          <span key={g.attribute.id}>
            {i > 0 && <span className="mx-1.5 opacity-60">×</span>}
            {describe(g.values.length, g.attribute)}
          </span>
        ))}
      </p>
      <span className="rounded-full bg-[var(--pf-navy)] px-3 py-1 text-xs font-medium text-white">
        up to {total} variant {total === 1 ? "row" : "rows"}
      </span>
    </div>
  );
}
