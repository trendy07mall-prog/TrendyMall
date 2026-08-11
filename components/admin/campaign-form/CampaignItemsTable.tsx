"use client";

import { formatPrice } from "@/lib/utils";
import { campaignPriceUndercuts } from "@/lib/campaign-pricing";
import type { ItemDraft, SectionDraft } from "@/components/admin/CampaignForm";

export function CampaignItemsTable({
  items,
  sections,
  onChange,
}: {
  items: ItemDraft[];
  sections: SectionDraft[];
  onChange: (next: ItemDraft[]) => void;
}) {
  function updateItem(clientKey: string, patch: Partial<ItemDraft>) {
    onChange(items.map((i) => (i.clientKey === clientKey ? { ...i, ...patch } : i)));
  }

  function removeItem(clientKey: string) {
    onChange(items.filter((i) => i.clientKey !== clientKey));
  }

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No products added yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left">
            <th className="py-2 pr-4">Product</th>
            <th className="py-2 pr-4">Current price</th>
            <th className="py-2 pr-4">Campaign price</th>
            <th className="py-2 pr-4">Section</th>
            <th className="py-2 pr-4">Active</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const currentPrice = item.salePrice ?? item.regularPrice;
            const noDiscount = !campaignPriceUndercuts(item.campaignPrice, item.regularPrice, item.salePrice);
            return (
              <tr key={item.clientKey} className="border-b border-[var(--border)]">
                <td className="py-2 pr-4">
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-xs text-[var(--muted)]">{item.variantLabel}</div>
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">{formatPrice(currentPrice)}</td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.campaignPrice}
                    onChange={(e) =>
                      updateItem(item.clientKey, { campaignPrice: Number(e.target.value) })
                    }
                    className={`w-28 rounded-[var(--radius-sm)] border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                      noDiscount
                        ? "border-[var(--color-warning)] focus:ring-[var(--color-warning)]"
                        : "border-[var(--border)] focus:ring-[var(--foreground)]"
                    }`}
                  />
                  {noDiscount && (
                    <p className="mt-1 text-xs text-[var(--color-warning)]">
                      Not lower than current price
                    </p>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <select
                    value={item.sectionClientKey ?? ""}
                    onChange={(e) =>
                      updateItem(item.clientKey, { sectionClientKey: e.target.value || null })
                    }
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                  >
                    <option value="">No section</option>
                    {sections.map((s) => (
                      <option key={s.clientKey} value={s.clientKey}>
                        {s.name || "(unnamed section)"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={(e) => updateItem(item.clientKey, { isActive: e.target.checked })}
                  />
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => removeItem(item.clientKey)}
                    className="text-sm text-red-600 underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
