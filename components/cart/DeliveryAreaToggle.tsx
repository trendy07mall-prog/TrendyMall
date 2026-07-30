"use client";

export type DeliveryArea = "colombo" | "outside" | null;

// A lightweight preview control only — it doesn't replace checkout's own
// address form or its own server-side fee computation, it just lets the
// cart summary show one concrete delivery figure instead of two possible
// ones before the customer reaches checkout.
export function DeliveryAreaToggle({
  value,
  onChange,
}: {
  value: DeliveryArea;
  onChange: (area: DeliveryArea) => void;
}) {
  const optionClass = (active: boolean) =>
    `transition-brand flex-1 rounded-full px-3 py-1.5 text-xs font-medium ${
      active ? "bg-[var(--foreground)] text-white" : "border border-[var(--border)] hover:bg-black/5"
    }`;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-[var(--muted)]">Delivery area</span>
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={value === "colombo"}
          onClick={() => onChange(value === "colombo" ? null : "colombo")}
          className={optionClass(value === "colombo")}
        >
          Colombo
        </button>
        <button
          type="button"
          aria-pressed={value === "outside"}
          onClick={() => onChange(value === "outside" ? null : "outside")}
          className={optionClass(value === "outside")}
        >
          Outside Colombo
        </button>
      </div>
    </div>
  );
}
