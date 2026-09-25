"use client";

import { WhatsAppIcon } from "@/components/ui/Icon";
import { getWhatsAppUrl } from "@/lib/site";
import { formatPrice } from "@/lib/utils";

export function WhatsAppOrderButton({
  productName,
  colorName,
  quantity,
  price,
  whatsappNumber,
}: {
  productName: string;
  colorName: string | null;
  quantity: number;
  price: number;
  // The store's real number, from Settings (general.whatsapp_number),
  // passed down from the page. This used to be a hardcoded constant in
  // this file, which is why changing the number in admin updated the
  // footer and the floating button but left this one messaging a number
  // the store no longer answers.
  whatsappNumber: string;
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

    const url = getWhatsAppUrl(lines.join("\n"), whatsappNumber);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--radius-btn)] border border-[#25D366]/30 bg-[#25D366]/10 px-6 py-3 text-center text-sm font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/15"
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
      Order via WhatsApp
    </button>
  );
}
