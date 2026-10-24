import "server-only";
import {
  getGeneralSettings,
  getPaymentSettings,
  getPoliciesSettings,
  getShippingSettings,
  type BusinessHoursWeek,
} from "@/lib/data/settings";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { getActiveCampaigns } from "@/lib/data/campaigns";
import { getActiveCoupons } from "@/lib/data/coupons";
import { getWhatsAppUrl, SITE_URL } from "@/lib/site";
import { formatPrice } from "@/lib/utils";
import { formatStoreDate, formatStoreDateTime } from "@/lib/datetime";
import { htmlToPlainText, type StoreContext } from "@/lib/support-chat/prompt";
import type { Campaign, Coupon } from "@/types";

const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function describeHours(week: BusinessHoursWeek): string {
  return Object.entries(week)
    .map(([day, hours]) => `${DAY_LABELS[day] ?? day} ${hours.closed ? "closed" : `${hours.open}-${hours.close}`}`)
    .join(", ");
}

const PROMOTION_LABELS: Record<Campaign["promotion_type"], string> = {
  product_discount: "discounts on selected products",
  flash_sale: "flash sale prices on selected products",
  free_shipping: "free delivery",
  coupon: "coupon savings",
};

function describeCampaign(campaign: Campaign): string {
  const parts = [
    `${campaign.name}: ${PROMOTION_LABELS[campaign.promotion_type] ?? "special offers"}`,
    campaign.free_shipping_enabled && campaign.promotion_type !== "free_shipping" ? "with free delivery" : "",
    campaign.end_at ? `ends ${formatStoreDateTime(campaign.end_at)}` : "no end date announced",
    `page ${SITE_URL}/campaign/${campaign.slug}`,
  ];
  const description = campaign.description ? htmlToPlainText(campaign.description).slice(0, 200) : "";
  return parts.filter(Boolean).join(", ") + (description ? `. ${description}` : "");
}

function describeCoupon(coupon: Coupon): string {
  const saving =
    coupon.type === "percentage"
      ? `${coupon.value}% off${coupon.max_discount_amount ? ` (up to ${formatPrice(coupon.max_discount_amount)})` : ""}`
      : coupon.type === "fixed"
        ? `${formatPrice(coupon.value)} off`
        : "free delivery";
  return [
    `Code ${coupon.code}: ${saving}`,
    coupon.min_order_value > 0 ? `on orders of ${formatPrice(coupon.min_order_value)} or more` : "",
    coupon.expires_at ? `valid until ${formatStoreDateTime(coupon.expires_at)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

// Offers are best-effort: a failed campaign or coupon read shouldn't stop
// the chat answering everything else.
async function orEmpty<T>(load: () => Promise<T[]>, label: string): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`[support-chat] ${label} unavailable`, error);
    return [];
  }
}

// Read from the same Settings rows the storefront renders, so an admin edit
// to a policy, fee or phone number reaches the assistant on the next
// message with nothing else to update.
export async function getSupportStoreContext(): Promise<StoreContext> {
  const [general, shipping, payment, policies, zones, campaigns, coupons] = await Promise.all([
    getGeneralSettings(),
    getShippingSettings(),
    getPaymentSettings(),
    getPoliciesSettings(),
    getActiveDeliveryZones(),
    orEmpty(getActiveCampaigns, "campaigns"),
    orEmpty(getActiveCoupons, "coupons"),
  ]);

  const paymentMethods = [
    payment.codEnabled && "Cash on Delivery",
    payment.bankTransferEnabled && "Bank transfer",
    payment.onlinePaymentEnabled && "Card payment online",
  ].filter((m): m is string => Boolean(m));

  return {
    storeName: general.storeName || "TrendyMall",
    siteUrl: SITE_URL,
    whatsappUrl: getWhatsAppUrl(undefined, general.whatsappNumber),
    phone: general.phone,
    email: general.email,
    address: general.address,
    businessHours: describeHours(general.businessHours),
    deliveryFees: zones.map(
      (zone) => `${zone.name}${zone.isDefault ? " (all other areas)" : ""}: ${formatPrice(zone.rate)}`,
    ),
    freeShipping:
      shipping.freeShippingEnabled && shipping.freeShippingMinAmount > 0
        ? `Free delivery on orders of ${formatPrice(shipping.freeShippingMinAmount)} or more.`
        : null,
    pickup: shipping.pickupEnabled
      ? `Free store pickup: ${[shipping.pickupName, shipping.pickupAddress, shipping.pickupHours, shipping.pickupInstructions]
          .filter(Boolean)
          .join(", ")}`
      : null,
    paymentMethods,
    campaigns: campaigns.map(describeCampaign),
    coupons: coupons.map(describeCoupon),
    shippingPolicy: htmlToPlainText(policies.shippingBody),
    returnsPolicy: htmlToPlainText(policies.returnsBody),
    warrantyPolicy: htmlToPlainText(policies.warrantyBody),
    today: formatStoreDate(new Date().toISOString()),
  };
}
