"use client";

import type { Attribute, AttributeValue } from "@/types";

export function AttributesField({
  attributesWithValues,
  defaultValueIds,
}: {
  attributesWithValues: { attribute: Attribute; values: AttributeValue[] }[];
  defaultValueIds: string[];
}) {
  const groupsWithValues = attributesWithValues.filter((g) => g.values.length > 0);
  if (groupsWithValues.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm font-medium">Attributes</span>
      {groupsWithValues.map(({ attribute, values }) => (
        <div key={attribute.id} className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
            {attribute.name}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {values.map((value) => (
              <label key={value.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="attributeValueIds"
                  value={value.id}
                  defaultChecked={defaultValueIds.includes(value.id)}
                />
                {value.color_hex && (
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
                    style={{ backgroundColor: value.color_hex }}
                    aria-hidden="true"
                  />
                )}
                {value.value}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
