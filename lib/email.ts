import { Resend } from "resend";
import { formatPrice } from "@/lib/utils";

const OWNER_EMAIL = "trendy07mall@gmail.com";

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
  total: number;
}

function buildOrderEmailHtml(order: OrderEmailData, forOwner: boolean): string {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr><td style="padding:4px 0;">${item.name} &times; ${item.quantity}</td><td style="padding:4px 0; text-align:right;">${formatPrice(item.subtotal)}</td></tr>`,
    )
    .join("");

  const intro = forOwner
    ? `<p>New order from ${order.customerName} (${order.customerEmail}).</p>`
    : `<p>Thanks for your order, ${order.customerName}! Order <strong>${order.orderNumber}</strong> has been received and is saved as pending payment. We'll follow up on payment and delivery separately.</p>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2>${forOwner ? `New order ${order.orderNumber}` : `Order ${order.orderNumber} confirmed`}</h2>
      ${intro}
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
        ${itemsHtml}
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid #ddd;">Delivery</td>
          <td style="padding: 8px 0; border-top: 1px solid #ddd; text-align: right;">${formatPrice(order.shippingFee)}</td>
        </tr>
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
