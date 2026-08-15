// Plain constants/types, split out of lib/admin/expenses.ts. A "use server"
// file may only export async functions -- Next.js enforces this since
// every export from such a file becomes a client-callable RPC reference;
// exporting a plain array/object/type crashes any client component that
// imports it ("A 'use server' file can only export async functions, found
// object"). Same class of client/server-boundary bug as Phase 1's
// finance-shared.ts split, different specific rule.

export const EXPENSE_CATEGORIES = [
  "product_purchase",
  "shipping",
  "packaging",
  "advertising",
  "marketing",
  "payment_fees",
  "software",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  product_purchase: "Product Purchase",
  shipping: "Shipping",
  packaging: "Packaging",
  advertising: "Advertising",
  marketing: "Marketing",
  payment_fees: "Payment Fees",
  software: "Software",
  other: "Other",
};

export const EXPENSE_PAYMENT_METHODS = ["cash", "bank_transfer", "card", "online", "other"] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  card: "Card",
  online: "Online",
  other: "Other",
};

export type ExpenseFormState = { error: string } | { success: true } | undefined;
