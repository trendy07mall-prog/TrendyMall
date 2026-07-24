"use client";

import { WhatsAppIcon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

const WHATSAPP_NUMBER = "94775312484";

export function WhatsAppOrderButton({
  productName,
  colorName,
  quantity,
  price,
}: {
  productName: string;
  colorName: string | null;
  quantity: number;
  price: number;
}) {
  function handleClick() {
    const lines = [
      "Hi, I'd like to order:",
      "",
      productName,
      colorName ? `Color: ${colorName}` : null,
      `Quantity: ${quantity}`,
      `Price: ${formatPrice(price)}`,
      "",
      typeof window !== "undefined" ? window.location.href : "",
    ].filter((line): line is string => line !== null);

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center gap-2 rounded-full border border-[var(--border)] px-6 py-3 text-sm font-medium transition-colors hover:bg-black/5"
    >
      <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
      Order via WhatsApp
    </button>
  );
}
