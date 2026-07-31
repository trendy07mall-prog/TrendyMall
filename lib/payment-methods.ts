// This map was independently duplicated in lib/invoice/InvoicePDF.tsx,
// components/order/OrderSummaryCard.tsx, and components/admin/OrdersTable.tsx
// — three copies is this codebase's own established threshold for
// extracting a repeated literal (see lib/site.ts's WHATSAPP_NUMBER
// comment), so this is the shared source now.
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  bank_transfer: "Bank Transfer",
  payhere: "Card (PayHere)",
};
