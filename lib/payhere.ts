import "server-only";

import crypto from "node:crypto";

// Feature flag: the Card (PayHere) option only appears at checkout once
// both env vars are set — COD and Bank Transfer work regardless.
export function isPayHereEnabled(): boolean {
  return Boolean(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);
}

export function getCheckoutUrl(): string {
  return process.env.PAYHERE_MODE === "live"
    ? "https://www.payhere.lk/pay/checkout"
    : "https://sandbox.payhere.lk/pay/checkout";
}

function md5Upper(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex").toUpperCase();
}

// hash = upper(md5(merchant_id + order_id + amount(2dp) + currency +
// upper(md5(merchant_secret)))) — PayHere's documented checkout hash
// scheme. Computed server-side only; merchant_secret never reaches the
// browser.
export function generateCheckoutHash(orderNumber: string, amount: number): string {
  const merchantId = process.env.PAYHERE_MERCHANT_ID!;
  const secret = process.env.PAYHERE_MERCHANT_SECRET!;
  const amountFormatted = amount.toFixed(2);
  return md5Upper(`${merchantId}${orderNumber}${amountFormatted}LKR${md5Upper(secret)}`);
}

export interface PayHereNotifyPayload {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
}

// md5sig = upper(md5(merchant_id + order_id + payhere_amount +
// payhere_currency + status_code + upper(md5(merchant_secret)))) —
// PayHere's documented notify_url verification scheme. Must pass before
// anything in the callback is trusted.
export function verifyNotifySignature(payload: PayHereNotifyPayload): boolean {
  const secret = process.env.PAYHERE_MERCHANT_SECRET!;
  const expected = md5Upper(
    `${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${payload.status_code}${md5Upper(secret)}`,
  );
  return expected === payload.md5sig.toUpperCase();
}

export const PAYHERE_STATUS = {
  SUCCESS: "2",
  PENDING: "0",
  CANCELLED: "-1",
  FAILED: "-2",
  CHARGEDBACK: "-3",
} as const;
