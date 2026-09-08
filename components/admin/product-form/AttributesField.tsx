"use client";

import type { Attribute, AttributeValue } from "@/types";

// Capacity-style values ("512gb", "1 TB") get the tile treatment: sorted by
// real magnitude and re-cased for display. Detected from the values
// themselves rather than from an attribute name, so it applies to whatever
// the admin has actually created without "Storage" being hard-coded here --
// and so a group of ranges like Mah's "5000mah to 10000mah" correctly falls
// through to plain pills.
const CAPACITY = /^\s*(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)\s*$/i;
const UNIT_SCALE: Record<string, number> = { kb: 1, mb: 1e3, gb: 1e6, tb: 1e9 };

function capacityOf(value: AttributeValue): number | null {
  const match = CAPACITY.exec(value.value);
  if (!match) return null;
  return Number(match[1]) * UNIT_SCALE[match[2].toLowerCase()];
}

// Display only. The stored value ("128gb") and its id are never touched --
// this is purely what the tile reads as ("128 GB").
function capacityLabel(value: AttributeValue): string {
  const match = CAPACITY.exec(value.value);
  if (!match) return value.value;
  return match[1] + " " + match[2].toUpperCase();
}

// Native checkbox, visually removed but still in the DOM and still focusable.
// It has to stay a real input: the server reads this field with
// formData.getAll("attributeValueIds"), so a div with role="checkbox" would
// submit nothing at all. Keeping the input also means the checked state, the
// accessible role, Tab order and Space all come from the platform -- the
// pills and tiles below are styling over that, not a reimplementation of it.
const SR_ONLY =
  "peer absolute h-px w-px overflow-hidden opacity-0 [clip:rect(0,0,0,0)]";

// Drawn on the <span>, driven by the sibling input's real state, so the
// focus ring tracks actual keyboard focus rather than a state we maintain.
const SELECTED =
  "peer-checked:border-[var(--pf-navy)] peer-checked:bg-[var(--pf-navy)] peer-checked:text-white";
const FOCUS_RING =
  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--pf-navy)]";

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

  // A native checkbox toggles on Space but ignores Enter, where inside a
  // form Enter means "submit". Handled here so both keys work on the pills
  // as designed, without an accidental submit from the second one.
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>, valueId: string) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    toggle(valueId, !value.includes(valueId));
  }

  return (
    <div className="flex flex-col gap-5">
      {groupsWithValues.map(({ attribute, values }) => {
        const isCapacityGroup = values.every((v) => capacityOf(v) !== null);
        // Sorted copy -- ascending by real magnitude, so 12 GB reads before
        // 512 GB regardless of the sort_order the values were saved with.
        const ordered = isCapacityGroup
          ? [...values].sort((a, b) => (capacityOf(a) ?? 0) - (capacityOf(b) ?? 0))
          : values;

        return (
          <div key={attribute.id} className="flex flex-col gap-2.5">
            <span className="text-[13px] font-medium text-[var(--pf-text-2)]">
              {attribute.name}
            </span>

            <div
              className={
                isCapacityGroup
                  ? "grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2"
                  : "flex flex-wrap gap-2"
              }
            >
              {ordered.map((v) => (
                <label
                  key={v.id}
                  className="cursor-pointer"
                  title={isCapacityGroup ? undefined : v.value}
                >
                  <input
                    type="checkbox"
                    name="attributeValueIds"
                    value={v.id}
                    checked={value.includes(v.id)}
                    onChange={(e) => toggle(v.id, e.target.checked)}
                    onKeyDown={(e) => onKeyDown(e, v.id)}
                    className={SR_ONLY}
                  />
                  <span
                    className={
                      "flex items-center justify-center gap-1.5 border border-[var(--border)] bg-[var(--color-card)] text-[13px] text-[var(--foreground)] transition-colors hover:border-[var(--pf-navy)] " +
                      (isCapacityGroup
                        ? "rounded-[var(--radius-sm)] px-3 py-2.5 font-medium "
                        : "rounded-full px-3.5 py-1.5 ") +
                      SELECTED +
                      " " +
                      FOCUS_RING
                    }
                  >
                    {/* Only the Color attribute's swatch means anything.
                        color_hex defaults to #000000 on every row, so
                        Connectors and Mah each carry a black dot that says
                        nothing -- invisible against the old checkbox list,
                        but a visible artifact once the pill fills navy. */}
                    {v.color_hex && attribute.slug === "color" && (
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--border)]"
                        style={{ backgroundColor: v.color_hex }}
                        aria-hidden="true"
                      />
                    )}
                    {isCapacityGroup ? capacityLabel(v) : v.value}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
