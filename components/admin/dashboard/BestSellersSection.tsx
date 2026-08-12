import Image from "next/image";
import { AwardIcon } from "@/components/ui/Icon";
import type { BestSellerRow } from "@/lib/admin/dashboard-query";

const RANK_ACCENT = ["bg-[#0F2D52] text-white", "bg-black/10 text-[#0F2D52]", "bg-black/5 text-[#0F2D52]"];

export function BestSellersSection({ bestSellers }: { bestSellers: BestSellerRow[] }) {
  if (bestSellers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] px-6 py-10 text-center">
        <AwardIcon className="h-6 w-6 text-[var(--color-text-secondary)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">No sales recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <ul className="flex flex-col gap-3">
        {bestSellers.map((product, index) => (
          <li key={product.productId ?? product.name} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                RANK_ACCENT[index] ?? "bg-black/5 text-[var(--color-text-secondary)]"
              }`}
            >
              {index + 1}
            </span>
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-black/5">
              {product.image ? (
                <Image src={product.image} alt="" fill sizes="44px" className="object-cover" />
              ) : null}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm">{product.name}</p>
            <p className="shrink-0 text-sm font-semibold">{product.quantity} sold</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
