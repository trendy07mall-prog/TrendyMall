import { toWhatsAppNumber } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/ui/Icon";
import { ORDER_STATUS_LABELS } from "@/lib/admin/orderStatusFlow";
import type { OrderFulfillmentStatus } from "@/types";

// Manual click-to-chat for now — a real automated WhatsApp Cloud API
// integration needs Meta business verification + pre-approved message
// templates (weeks, not an API key). This link is structured so a future
// automated provider could be called from the same admin order actions
// without rewriting them; see the Phase 4 plan notes for detail.
export function WhatsAppOrderLink({
  phone,
  orderNumber,
  orderStatus,
  customerName,
}: {
  phone: string;
  orderNumber: string;
  orderStatus: OrderFulfillmentStatus;
  customerName: string;
}) {
  const number = toWhatsAppNumber(phone);
  const message = `Hi ${customerName}, this is TrendyMall. An update on your order ${orderNumber}: it's now ${ORDER_STATUS_LABELS[orderStatus]}.`;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-brand inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/5"
    >
      <WhatsAppIcon className="h-4 w-4" />
      Message on WhatsApp
    </a>
  );
}
