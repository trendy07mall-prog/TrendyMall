"use client";

import type { Attribute, AttributeValue } from "@/types";

export function AttributesField({
  attributesWithValues,
  value,
  onChange,
}: {
  attributesWithValues: { attribute: Attribute; values: AttributeValue[] }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const groupsWithValues = attributesWithValues.filter((g) => g.values.length > 0);
  if (groupsWithValues.length === 0) return null;

  function toggle(valueId: string, checked: boolean) {
    onChange(checked ? [...value, valueId] : value.filter((id) => id !== valueId));
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm font-medium">Attributes</span>
      {groupsWithValues.map(({ attribute, values }) => (
        <div key={attribute.id} className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">
            {attribute.name}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {values.map((v) => (
              <label key={v.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="attributeValueIds"
                  value={v.id}
                  checked={value.includes(v.id)}
                  onChange={(e) => toggle(v.id, e.target.checked)}
                />
                {v.color_hex && (
                  <span
                    className="inline-block h-3 w-3 rounded-full border border-[var(--border)]"
                    style={{ backgroundColor: v.color_hex }}
                    aria-hidden="true"
                  />
                )}
                {v.value}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
