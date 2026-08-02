import { Resend } from "resend";
import { formatPrice } from "@/lib/utils";
import { describeDeliveryFee } from "@/lib/delivery-fee";
import { SITE_URL } from "@/lib/site";

const OWNER_EMAIL = "trendy07mall@gmail.com";

// Also used as Reply-To on every customer-facing send: we send from our own
// domain (trendymall.online, once verified in Resend) for SPF/DKIM to pass,
// but a customer hitting "Reply" should still land in a real inbox someone
// reads, not a noreply@ dead end.
function fromHeader(fromEmail: string): string {
  return `"TrendyMall" <${fromEmail}>`;
}

// No logo appeared in any email before this — this is a new addition, not
// a swap. Most email clients (Outlook, Gmail's image-proxy, etc.) strip
// SVG and often data URIs too, so this has to be a PNG at an absolute,
// publicly-fetchable URL — the same static file Next.js already serves
// for the header/footer, not a separate asset.
const EMAIL_LOGO_HTML = `<img src="${SITE_URL}/images/logo/trendymall-logo.png" alt="TrendyMall" width="120" height="71" style="display:block; margin-bottom: 16px;" />`;

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
  // Used only to derive the "why" label below the fee (describeDeliveryFee)
  // — the fee itself is always shippingFee above, the order's own stored,
  // server-computed value, never recomputed from these.
  shippingDistrict: string;
  shippingPostalCode: string | null;
  deliveryMethod: "standard" | "pickup";
  paymentMethod: "cod" | "bank_transfer" | "payhere";
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
      : order.paymentMethod === "payhere"
        ? `<p>Thanks for your order, ${order.customerName}! Order <strong>${order.orderNumber}</strong> has been received and your card payment is being processed. We'll email you once it's confirmed.</p>`
        : `<p>Thanks for your order, ${order.customerName}! Order <strong>${order.orderNumber}</strong> has been received and is saved as pending payment. We'll follow up on payment and delivery separately.</p>`;

  const intro = forOwner
    ? `<p>New order from ${order.customerName} (${order.customerEmail}).</p>`
    : customerIntro;

  const deliveryReason = describeDeliveryFee({
    district: order.shippingDistrict,
    postalCode: order.shippingPostalCode,
    deliveryMethod: order.deliveryMethod,
  }).reason;

  const deliveryRow =
    order.deliveryMethod === "pickup"
      ? `<tr><td style="padding: 8px 0; border-top: 1px solid #ddd;">Delivery</td><td style="padding: 8px 0; border-top: 1px solid #ddd; text-align: right;">Store Pickup</td></tr>`
      : `<tr><td style="padding: 8px 0; border-top: 1px solid #ddd;">Delivery (${deliveryReason})</td><td style="padding: 8px 0; border-top: 1px solid #ddd; text-align: right;">${formatPrice(order.shippingFee)}</td></tr>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      ${EMAIL_LOGO_HTML}
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
// fail the order it's confirming. The Resend SDK itself never rejects (a
// failed send resolves as { data: null, error }, not a thrown exception),
// so every result — including each entry of the Promise.allSettled array
// below — is checked for an `error` field and logged if present. Without
// this, a bounced/rejected customer send is otherwise indistinguishable
// from a working admin send from the outside — exactly what let the
// customer-email-never-arrives bug go unnoticed.
export async function sendOrderConfirmationEmails(order: OrderEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;

  try {
    const resend = new Resend(apiKey);
    const results = await Promise.allSettled([
      resend.emails.send({
        from: fromHeader(fromEmail),
        to: OWNER_EMAIL,
        replyTo: OWNER_EMAIL,
        subject: `New order ${order.orderNumber}`,
        html: buildOrderEmailHtml(order, true),
      }),
      resend.emails.send({
        from: fromHeader(fromEmail),
        to: order.customerEmail,
        replyTo: OWNER_EMAIL,
        subject: `Your TrendyMall order ${order.orderNumber}`,
        html: buildOrderEmailHtml(order, false),
      }),
    ]);
    const recipients = [OWNER_EMAIL, order.customerEmail];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error(`sendOrderConfirmationEmails: send to ${recipients[i]} failed`, result.reason);
      } else if (result.value.error) {
        console.error(`sendOrderConfirmationEmails: send to ${recipients[i]} rejected by Resend`, result.value.error);
      }
    });
  } catch (error) {
    // Sending is best-effort — order creation already succeeded.
    console.error("sendOrderConfirmationEmails failed", error);
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
    const { error } = await resend.emails.send({
      from: fromHeader(fromEmail),
      to: order.customerEmail,
      replyTo: OWNER_EMAIL,
      subject: `Payment verified — order ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          ${EMAIL_LOGO_HTML}
          <h2>Order ${order.orderNumber}</h2>
          <p>Hi ${order.customerName}, we've verified your bank transfer payment. Your order is now confirmed and will be processed shortly.</p>
        </div>
      `,
    });
    if (error) console.error(`sendPaymentVerifiedEmail: send to ${order.customerEmail} rejected by Resend`, error);
  } catch (error) {
    // Sending is best-effort — the verification already succeeded.
    console.error("sendPaymentVerifiedEmail failed", error);
  }
}

// Best-effort, same as the others. Generic — takes a pre-resolved human
// label rather than an OrderStatus union, since the admin actions
// (lib/admin/orderActions.ts) key off order_status/payment_status instead.
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
    const { error } = await resend.emails.send({
      from: fromHeader(fromEmail),
      to: order.customerEmail,
      replyTo: OWNER_EMAIL,
      subject: `Your TrendyMall order ${order.orderNumber} is now ${order.label}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          ${EMAIL_LOGO_HTML}
          <h2>Order ${order.orderNumber}</h2>
          <p>Hi ${order.customerName}, your order status has been updated to:</p>
          <p style="font-size: 18px; font-weight: bold;">${order.label}</p>
          ${order.detail ? `<p>${order.detail}</p>` : ""}
        </div>
      `,
    });
    if (error) console.error(`sendOrderStatusEmail: send to ${order.customerEmail} rejected by Resend`, error);
  } catch (error) {
    // Sending is best-effort — the status change already succeeded.
    console.error("sendOrderStatusEmail failed", error);
  }
}
