import "server-only";
import {
  getGeneralSettings,
  getPaymentSettings,
  getPoliciesSettings,
  getShippingSettings,
  type BusinessHoursWeek,
} from "@/lib/data/settings";
import { getActiveDeliveryZones } from "@/lib/data/delivery-zones";
import { getWhatsAppUrl, SITE_URL } from "@/lib/site";
import { formatPrice } from "@/lib/utils";
import { formatStoreDate } from "@/lib/datetime";
import { htmlToPlainText, type StoreContext } from "@/lib/support-chat/prompt";

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

// Read from the same Settings rows the storefront renders, so an admin edit
// to a policy, fee or phone number reaches the assistant on the next
// message with nothing else to update.
export async function getSupportStoreContext(): Promise<StoreContext> {
  const [general, shipping, payment, policies, zones] = await Promise.all([
    getGeneralSettings(),
    getShippingSettings(),
    getPaymentSettings(),
    getPoliciesSettings(),
    getActiveDeliveryZones(),
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
    shippingPolicy: htmlToPlainText(policies.shippingBody),
    returnsPolicy: htmlToPlainText(policies.returnsBody),
    warrantyPolicy: htmlToPlainText(policies.warrantyBody),
    today: formatStoreDate(new Date().toISOString()),
  };
}
