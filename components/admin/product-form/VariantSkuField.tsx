"use client";

import { useEffect, useId, useRef, useState } from "react";
import { checkVariantSku } from "@/lib/admin/sku-check";

// The variant SKU input, plus a live read-only look-ahead against
// product_variants.
//
// Strictly advisory. Nothing here gates the submit and nothing here
// replaces the duplicate-key handling in createProduct/updateProduct --
// that is still what actually decides, and it still has to, because the
// answer can go stale between this check and the save, and because the
// admin can submit over a warning. All this buys is finding out at typing
// time instead of at save time.
export function VariantSkuField({
  value,
  onChange,
  variantId,
  className,
  onChecked,
}: {
  value: string;
  onChange: (next: string) => void;
  // Set for a row that already exists in the DB, so its own SKU isn't
  // reported back as taken by itself.
  variantId?: string;
  className: string;
  // Reports each completed check upward so the sticky bar can mention a
  // clash. Must be referentially stable -- it is an effect dependency.
  onChecked?: (sku: string, taken: boolean) => void;
}) {
  // The verdict is stored with the SKU it was about, and only displayed
  // while it still matches what is in the box. That makes the "no verdict
  // yet" states -- field cleared, field edited since the last answer --
  // fall out of rendering instead of needing an effect to reset them.
  const [result, setResult] = useState<{ sku: string; taken: boolean } | null>(null);
  const statusId = useId();
  // Only the newest request may write to state -- without this a slow
  // answer for "AB" can land after a fast one for "ABC". The SKU is
  // re-checked on arrival too, but the counter also covers two checks of
  // the same string racing each other.
  const requestRef = useRef(0);

  const sku = value.trim();
  const verdict = result && result.sku === sku ? result : null;

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const request = ++requestRef.current;
    const timer = setTimeout(async () => {
      try {
        const answer = await checkVariantSku(trimmed, variantId);
        if (request !== requestRef.current) return;
        // A failed lookup is not evidence either way, so it leaves the
        // field unmarked rather than showing a green "available" the admin
        // might rely on.
        if ("error" in answer) return;
        setResult({ sku: trimmed, taken: answer.taken });
        onChecked?.(trimmed, answer.taken);
      } catch {
        // Same reasoning: an unauthorized/offline check says nothing about
        // the SKU, so nothing is shown.
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [value, variantId, onChecked]);

  // Applied inline rather than as utility classes: the shared input class
  // this field is handed already sets bg-transparent and a border color,
  // and which of two same-specificity utilities wins comes down to their
  // order in the compiled stylesheet, not the order in the attribute. The
  // border landed but the tint silently didn't.
  const tone = verdict
    ? {
        borderColor: verdict.taken ? "var(--pf-bad)" : "var(--pf-ok)",
        backgroundColor: verdict.taken ? "var(--pf-bad-bg)" : "var(--pf-ok-bg)",
      }
    : undefined;

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        placeholder="SKU (optional)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        style={tone}
        aria-describedby={verdict ? statusId : undefined}
      />
      {/* Polite, so the verdict is announced without interrupting typing. */}
      <span id={statusId} aria-live="polite" className="text-[11px]">
        {verdict?.taken && <span className="text-[var(--pf-bad)]">✕ Already in use</span>}
        {verdict && !verdict.taken && (
          <span className="text-[var(--pf-ok)]">✓ Available</span>
        )}
      </span>
    </div>
  );
}
