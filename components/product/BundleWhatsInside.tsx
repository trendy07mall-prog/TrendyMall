import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export interface BundleInsideItem {
  name: string;
  slug: string;
  image: string | null;
  colorName: string | null;
  quantity: number;
}

// The "what's in this bundle" card on a bundle's product page.
//
// Each item links to its own product page, because a shopper comparing a
// bundle against buying the pieces separately will want to look -- and
// hiding that would make the advertised saving feel like a claim rather
// than something they can check. The saving is shown as cash next to the
// separate total for the same reason.
//
// No per-item price: what is being sold is the bundle, at one price, and
// the items inside are fixed (v1 -- the shop owner picks the exact option
// that goes in the box, so there is nothing here for the customer to
// choose). Pricing each line would invite the reader to add them up and
// get a different number from the one on the page.
export function BundleWhatsInside({
  items,
  separateTotal,
  saving,
}: {
  items: BundleInsideItem[];
  separateTotal: number;
  saving: number;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--color-card)] p-4">
      <h2 className="text-sm font-semibold">What&apos;s in this bundle</h2>

      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index}>
            <Link
              href={`/product/${item.slug}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-white">
                {item.image && (
                  <Image src={item.image} alt="" fill sizes="48px" className="object-contain" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {(item.colorName || item.quantity > 1) && (
                  <p className="text-xs text-[var(--muted)]">
                    {item.colorName}
                    {item.colorName && item.quantity > 1 ? " · " : ""}
                    {item.quantity > 1 ? `Qty ${item.quantity}` : ""}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {saving > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm">
          <span className="text-[var(--muted)]">
            Bought separately: <s>{formatPrice(separateTotal)}</s>
          </span>
          <span className="font-semibold text-[var(--color-discount)]">
            You save {formatPrice(saving)}
          </span>
        </div>
      )}
    </div>
  );
}
