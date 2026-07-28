import { Resend } from "resend";
import { formatPrice } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const OWNER_EMAIL = "trendy07mall@gmail.com";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface OrderEmailItem {
  name: string;
  quantity: number;
  subtotal: number;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderEmailItem[];
  shippingFee: number;
  deliveryMethod: "standard" | "pickup";
  paymentMethod: "cod" | "bank_transfer";
  total: number;
}

function buildOrderEmailHtml(order: OrderEmailData, forOwner: boolean): string {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:4px 0;">${item.name} &times; ${item.quantity}</td><td style="padding:4px 0; text-align:right;">${formatPrice(item.subtotal)}</td></tr>`,
    )
    .join("");

  const customerIntro =
    order.paymentMethod === "bank_transfer"
      ? `<p>Thanks for your order, ${order.customerName}! Order <strong>${order.orderNumber}</strong> has been received and is awaiting payment verification. We'll email you once it's confirmed.</p>`
      : `<p>Thanks for your order, ${order.customerName}! Order <strong>${order.orderNumber}</strong> has been received and is saved as pending payment. We'll follow up on payment and delivery separately.</p>`;

  const intro = forOwner
    ? `<p>New order from ${order.customerName} (${order.customerEmail}).</p>`
    : customerIntro;

  const deliveryRow =
    order.deliveryMethod === "pickup"
      ? `<tr><td style="padding: 8px 0; border-top: 1px solid #ddd;">Delivery</td><td style="padding: 8px 0; border-top: 1px solid #ddd; text-align: right;">Store Pickup</td></tr>`
      : `<tr><td style="padding: 8px 0; border-top: 1px solid #ddd;">Delivery</td><td style="padding: 8px 0; border-top: 1px solid #ddd; text-align: right;">${formatPrice(order.shippingFee)}</td></tr>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2>${forOwner ? `New order ${order.orderNumber}` : `Order ${order.orderNumber} confirmed`}</h2>
      ${intro}
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
        ${itemsHtml}
        ${deliveryRow}
        <tr style="font-weight: bold;">
          <td style="padding: 4px 0;">Total</td>
          <td style="padding: 4px 0; text-align: right;">${formatPrice(order.total)}</td>
        </tr>
      </table>
    </div>
  `;
}

// Best-effort: silently no-ops if Resend isn't configured yet (see
// .env.example / SETUP.md), and never throws — a failed email should never
// fail the order it's confirming.
export async function sendOrderConfirmationEmails(order: OrderEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;

  try {
    const resend = new Resend(apiKey);
    await Promise.allSettled([
      resend.emails.send({
        from: fromEmail,
        to: OWNER_EMAIL,
        subject: `New order ${order.orderNumber}`,
        html: buildOrderEmailHtml(order, true),
      }),
      resend.emails.send({
        from: fromEmail,
        to: order.customerEmail,
        subject: `Your TrendyMall order ${order.orderNumber}`,
        html: buildOrderEmailHtml(order, false),
      }),
    ]);
  } catch {
    // Sending is best-effort — order creation already succeeded.
  }
}

// Best-effort, same as the others — a failed email should never block the
// verification action that triggered it.
export async function sendPaymentVerifiedEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: order.customerEmail,
      subject: `Payment verified — order ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <h2>Order ${order.orderNumber}</h2>
          <p>Hi ${order.customerName}, we've verified your bank transfer payment. Your order is now confirmed and will be processed shortly.</p>
        </div>
      `,
    });
  } catch {
    // Sending is best-effort — the verification already succeeded.
  }
}

// Best-effort, same as the others. Generic replacement for
// sendOrderStatusUpdateEmail's new call sites (lib/admin/orderActions.ts)
// — takes a pre-resolved human label rather than the legacy OrderStatus
// union, since Phase 4's admin actions key off order_status/payment_status
// instead. sendOrderStatusUpdateEmail itself is kept below, unused by new
// code but not deleted (nothing requires removing it this phase).
export async function sendOrderStatusEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  label: string;
  detail?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: order.customerEmail,
      subject: `Your TrendyMall order ${order.orderNumber} is now ${order.label}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <h2>Order ${order.orderNumber}</h2>
          <p>Hi ${order.customerName}, your order status has been updated to:</p>
          <p style="font-size: 18px; font-weight: bold;">${order.label}</p>
          ${order.detail ? `<p>${order.detail}</p>` : ""}
        </div>
      `,
    });
  } catch {
    // Sending is best-effort — the status change already succeeded.
  }
}

// Best-effort, same as sendOrderConfirmationEmails — a failed email should
// never block the status change that triggered it. Customer-facing only
// (the admin making the change already knows).
export async function sendOrderStatusUpdateEmail(order: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;

  try {
    const resend = new Resend(apiKey);
    const statusLabel = STATUS_LABELS[order.status];
    await resend.emails.send({
      from: fromEmail,
      to: order.customerEmail,
      subject: `Your TrendyMall order ${order.orderNumber} is now ${statusLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <h2>Order ${order.orderNumber}</h2>
          <p>Hi ${order.customerName}, your order status has been updated to:</p>
          <p style="font-size: 18px; font-weight: bold;">${statusLabel}</p>
        </div>
      `,
    });
  } catch {
    // Sending is best-effort — the status change already succeeded.
  }
}
