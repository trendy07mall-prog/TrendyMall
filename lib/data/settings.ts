// "use server" (Phase 3) -- app/cart/page.tsx is a "use client" component
// that needs getShippingSettings() directly (the free-shipping-threshold
// estimate), the same way it already calls lib/cart-validation.ts's
// Server Actions. Every existing Server Component caller from Phases 1-2
// is unaffected -- calling a "use server" function directly from another
// server-side function works exactly the same as before.
"use server";

import { createClient } from "@/lib/supabase/server";

export type BusinessDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface BusinessHours {
  open: string;
  close: string;
  closed: boolean;
}

export type BusinessHoursWeek = Record<BusinessDay, BusinessHours>;

export interface GeneralSettings {
  storeName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  currency: string;
  timezone: string;
  businessHours: BusinessHoursWeek;
}

export interface BrandingSettings {
  logoDesktopUrl: string;
  logoMobileUrl: string;
  faviconUrl: string;
  adminLogoUrl: string;
  colorPrimary: string;
  colorAccent: string;
  colorSuccess: string;
}

export interface ContactSettings {
  whatsappEnabled: boolean;
  whatsappDefaultMessage: string;
}

export type AnnouncementMessageKind =
  | "delivery_in_zone"
  | "delivery_outside_zone"
  | "cod"
  | "whatsapp"
  | "custom";

export interface AnnouncementMessage {
  kind: AnnouncementMessageKind;
  icon?: string;
  text?: string;
  href?: string;
}

export interface AnnouncementSettings {
  enabled: boolean;
  messages: AnnouncementMessage[];
  autoRotate: boolean;
  rotateSpeedMs: number;
}

export interface HomepageSettings {
  heroEnabled: boolean;
  heroAutoplay: boolean;
  heroSlideDurationMs: number;
  heroShowArrows: boolean;
  heroShowDots: boolean;
}

export interface ShippingSettings {
  freeShippingEnabled: boolean;
  freeShippingMinAmount: number;
  pickupEnabled: boolean;
  pickupName: string;
  pickupAddress: string;
  pickupInstructions: string;
  pickupHours: string;
}

export interface PaymentSettings {
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  onlinePaymentEnabled: boolean;
}

// Each body is sanitized HTML (see lib/admin/settings.ts's
// POLICY_SANITIZE_OPTIONS) covering only the substantive policy prose --
// content that must stay live (the Shipping page's delivery-zone rate
// table, every page's Contact Us block) is NOT part of these strings; it
// renders as real JSX around them (components/content/PolicyBody.tsx).
export interface PoliciesSettings {
  shippingBody: string;
  returnsBody: string;
  privacyBody: string;
  termsBody: string;
  warrantyBody: string;
}

export interface SeoSettings {
  siteTitleDefault: string;
  titleTemplate: string;
  metaDescription: string;
  // Empty = keep using the auto-generated /opengraph-image route.
  ogImageUrl: string;
}

// Empty string = platform not shown (Footer icon + JSON-LD sameAs both
// skip it) -- same "off/empty by default" convention as every other
// optional Settings field in this file.
export interface SocialSettings {
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  twitterUrl: string;
}

// Every toggle gates only the STORE OWNER'S copy of a notification --
// customer-facing emails (order confirmation, payment verified, status
// updates) are never affected by any of these, on or off.
export interface NotificationSettings {
  newOrderEnabled: boolean;
  newReviewEnabled: boolean;
  newSubscriberEnabled: boolean;
  lowStockEnabled: boolean;
  paymentReceivedEnabled: boolean;
  campaignEndingEnabled: boolean;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

// Deliberately dormant -- enabled defaults false and, as of this phase,
// nothing anywhere reads this setting to affect pricing/checkout/orders.
// It exists purely as future marketplace groundwork (see
// lib/admin/commission-rules.ts and sql/072_commission_settings.sql).
export interface CommissionSettings {
  enabled: boolean;
  type: "category_based";
  defaultPercent: number;
}

// Hardcoded fallbacks -- the exact values every one of these fields
// currently holds in the live site today (per the pre-implementation
// audit). Used only if a settings row is ever missing/unreadable, so a
// database hiccup can never blank out the storefront's contact info,
// hours, or announcement bar.
const GENERAL_FALLBACK: GeneralSettings = {
  storeName: "TrendyMall",
  tagline: "Sri Lanka's trusted destination for premium mobile phone accessories.",
  description:
    "Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available.",
  email: "trendy07mall@gmail.com",
  phone: "+94750187145",
  whatsappNumber: "94775312484",
  address: "Salawatta Road, Wellampitiya, Sri Lanka",
  currency: "LKR",
  timezone: "Asia/Colombo",
  businessHours: {
    mon: { open: "10:00", close: "16:00", closed: false },
    tue: { open: "10:00", close: "16:00", closed: false },
    wed: { open: "10:00", close: "16:00", closed: false },
    thu: { open: "10:00", close: "16:00", closed: false },
    fri: { open: "10:00", close: "16:00", closed: false },
    sat: { open: "10:00", close: "16:00", closed: false },
    sun: { open: "10:00", close: "16:00", closed: false },
  },
};

const BRANDING_FALLBACK: BrandingSettings = {
  logoDesktopUrl: "/images/logo/trendymall-logo.png",
  logoMobileUrl: "/images/logo/trendymall-logo.png",
  faviconUrl: "/images/logo/trendymall-mark.png",
  adminLogoUrl: "/images/logo/trendymall-mark.png",
  colorPrimary: "#111111",
  colorAccent: "#f97316",
  colorSuccess: "#22c55e",
};

const CONTACT_FALLBACK: ContactSettings = {
  whatsappEnabled: true,
  whatsappDefaultMessage: "Hi! I have a question about my order.",
};

const ANNOUNCEMENT_FALLBACK: AnnouncementSettings = {
  enabled: true,
  messages: [
    { kind: "delivery_in_zone", icon: "truck" },
    { kind: "delivery_outside_zone", icon: "truck" },
    { kind: "custom", icon: "cash", text: "Cash on Delivery" },
    { kind: "whatsapp", icon: "whatsapp", text: "Need Help? WhatsApp Us" },
  ],
  autoRotate: true,
  rotateSpeedMs: 4000,
};

// Matches SlideCarousel.tsx's own DEFAULT_SLIDE_DURATION and today's
// unconditional autoplay/arrows/dots-on behavior exactly.
const HOMEPAGE_FALLBACK: HomepageSettings = {
  heroEnabled: true,
  heroAutoplay: true,
  heroSlideDurationMs: 4000,
  heroShowArrows: true,
  heroShowDots: true,
};

// No sitewide free-shipping threshold existed before Phase 3 -- off by
// default matches today's real behavior exactly (a no-op until an admin
// turns it on). Pickup fields match CheckoutForm.tsx's own previous
// PICKUP_ADDRESS/PICKUP_HOURS constants.
const SHIPPING_FALLBACK: ShippingSettings = {
  freeShippingEnabled: false,
  freeShippingMinAmount: 0,
  pickupEnabled: true,
  pickupName: "TrendyMall Store",
  pickupAddress: "Salawatta Road, Wellampitiya",
  pickupInstructions: "",
  pickupHours: "Daily, 10am – 4pm",
};

// All three methods are unconditionally available today (COD/Bank
// Transfer have no toggle at all; Online Payment is separately gated by
// the real isPayHereEnabled() env check regardless of this setting).
const PAYMENT_FALLBACK: PaymentSettings = {
  codEnabled: true,
  bankTransferEnabled: true,
  onlinePaymentEnabled: true,
};

// Matches sql/069's seed rows exactly -- these are the real current public
// policy pages' content (converted from JSX to equivalent HTML), so this
// fallback is a no-op until an admin actually edits something, same as
// every other group's fallback. Two corrections vs. the literal
// pre-Phase-4 text: Terms/Privacy both said "Cash on Delivery only",
// stale since Phase 3 shipped Bank Transfer and (env-gated) Card Payment.
const POLICIES_FALLBACK: PoliciesSettings = {
  shippingBody: `<p>At TrendyMall, we are committed to delivering your orders quickly and securely across Sri Lanka.</p>
<h2>Delivery Time</h2>
<ul>
<li>Colombo 01–15: 1–2 working days</li>
<li>Other areas: 2–4 working days</li>
<li>These timeframes are estimated, not guaranteed — actual delivery can vary by location and courier availability</li>
<li>Orders are processed within 24 hours after confirmation (excluding Sundays and public holidays)</li>
</ul>
<h2>Cash on Delivery</h2>
<p>Cash on Delivery (COD) is available for eligible orders across Sri Lanka.</p>
<h2>Order Tracking</h2>
<p>Once your order has been dispatched, you will receive tracking updates via WhatsApp, SMS, and email.</p>
<h2>Delivery Coverage</h2>
<p>We deliver to all major cities and most areas across Sri Lanka.</p>
<p>If you have any questions about your order or delivery, our customer support team is always ready to assist you.</p>`,
  returnsBody: `<p>Your satisfaction is important to us. Please review our return policy before making a purchase.</p>
<h2>Returns</h2>
<ul>
<li>Returns are accepted only for products that arrive damaged, defective, or incorrectly shipped.</li>
<li>Any return request must be made within 48 hours of receiving your order.</li>
</ul>
<h2>Non-Returnable Items</h2>
<p>For hygiene and quality assurance reasons, we do not accept returns or exchanges on opened or used electronic accessories, unless the item is faulty.</p>
<h2>Refunds &amp; Replacements</h2>
<p>After inspecting the returned item, TrendyMall will provide either:</p>
<ul>
<li>A replacement product (subject to stock availability), or</li>
<li>A full refund if a replacement is unavailable.</li>
</ul>
<h2>Return Conditions</h2>
<p>Returned items must:</p>
<ul>
<li>Be in their original packaging.</li>
<li>Include all accessories and documentation.</li>
<li>Show no signs of misuse or physical damage caused after delivery.</li>
</ul>
<p>For assistance, please contact our customer support team before returning any item.</p>`,
  privacyBody: `<p>TrendyMall ("we", "us") respects your privacy. This policy explains what information we collect when you use trendymall.lk, why we collect it, and how it's protected.</p>
<h2>Information We Collect</h2>
<p>When you create an account, place an order, or contact us, we collect:</p>
<ul>
<li>Your name, email address, and phone number</li>
<li>Your delivery address</li>
<li>Order history and the products you've purchased</li>
<li>Basic site-usage data (pages visited, general location) via Google Analytics and Meta Pixel, if enabled</li>
</ul>
<p>We do not collect or store your payment card details — card payments (when available) are processed securely by our payment partner, PayHere. Cash on Delivery and Bank Transfer orders are handled by us directly.</p>
<h2>How We Use Your Information</h2>
<ul>
<li>To process and deliver your orders</li>
<li>To send order confirmations and delivery updates</li>
<li>To respond to your questions and support requests</li>
<li>To send occasional marketing emails, only if you've subscribed to our newsletter — you can unsubscribe at any time</li>
<li>To improve our website and product range</li>
</ul>
<h2>How We Store and Protect It</h2>
<p>Your data is stored securely with Supabase, our database provider, which encrypts data in transit and at rest. Access to customer data is restricted to TrendyMall staff who need it to fulfil your order.</p>
<h2>Sharing</h2>
<p>We do not sell your personal information. We share the minimum necessary details (name, phone, address) with our delivery partners solely to deliver your order.</p>
<h2>Your Rights</h2>
<p>You can request a copy of the personal data we hold about you, ask us to correct it, or ask us to delete your account and associated data, by contacting us at <a href="mailto:trendy07mall@gmail.com">trendy07mall@gmail.com</a>.</p>
<h2>Cookies</h2>
<p>We use cookies and similar technologies for essential site functionality (like keeping items in your cart) and, where enabled, for analytics (Google Analytics) and advertising (Meta Pixel) to understand how our site is used and improve it.</p>
<h2>Changes to This Policy</h2>
<p>We may update this policy from time to time. Continued use of the site after changes means you accept the updated policy.</p>`,
  termsBody: `<p>These terms govern your use of trendymall.lk and any purchase you make with us. By placing an order, you agree to these terms.</p>
<h2>Products &amp; Pricing</h2>
<p>We make every effort to display accurate product information, images, and pricing (in LKR). Prices and stock availability are subject to change without notice. If we discover a pricing error after your order is placed, we'll contact you before proceeding.</p>
<h2>Orders &amp; Payment</h2>
<p>We accept Cash on Delivery (COD), Bank Transfer, and Card Payment (where enabled) as payment methods. Placing an order is an offer to purchase, which we may accept, decline, or cancel (for example, if a product is out of stock).</p>
<h2>Delivery &amp; Shipping</h2>
<p>See our <a href="/shipping">Shipping Policy</a> for delivery times and charges. Delivery estimates are not guaranteed and may vary due to courier delays or circumstances outside our control.</p>
<h2>Returns &amp; Refunds</h2>
<p>See our <a href="/returns">Returns &amp; Refunds Policy</a> for details on damaged, defective, or incorrect items.</p>
<h2>Account Use</h2>
<p>You're responsible for keeping your account credentials confidential and for all activity under your account. Please provide accurate contact and delivery information — we're not responsible for delivery issues caused by incorrect details.</p>
<h2>Limitation of Liability</h2>
<p>TrendyMall is not liable for indirect or incidental damages arising from the use of our products or website, to the extent permitted by Sri Lankan law.</p>
<h2>Changes</h2>
<p>We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.</p>`,
  warrantyBody: `<p>Warranty details coming soon — contact us with questions.</p>`,
};

// Byte-identical to today's root app/layout.tsx metadata literals.
const SEO_FALLBACK: SeoSettings = {
  siteTitleDefault: "Premium Mobile Phone Accessories | TrendyMall Sri Lanka",
  titleTemplate: "%s | TrendyMall",
  metaDescription:
    "Shop premium mobile phone accessories in Sri Lanka including chargers, earphones, power banks, phone cases, and more. Fast islandwide delivery and Cash on Delivery available.",
  ogImageUrl: "",
};

// The two real live URLs today (Footer.tsx, app/layout.tsx's JSON-LD
// sameAs) -- every other platform defaults empty/hidden until an admin
// adds one.
const SOCIAL_FALLBACK: SocialSettings = {
  facebookUrl: "https://www.facebook.com/share/18oKpTZ1fg/?mibextid=wwXIfr",
  instagramUrl: "https://www.instagram.com/trendy_.mall_._?igsh=MTE4M2IyM3lpeWs1YQ%3D%3D&utm_source=qr",
  tiktokUrl: "",
  youtubeUrl: "",
  twitterUrl: "",
};

// All six default on -- New Order already fires unconditionally today
// (this just makes it toggleable without changing behavior), and for the
// five genuinely new ones, the friendlier default is "tell the owner" --
// an unwanted email costs nothing, a silently-missed low-stock or payment
// alert is the worse failure mode.
const NOTIFICATIONS_FALLBACK: NotificationSettings = {
  newOrderEnabled: true,
  newReviewEnabled: true,
  newSubscriberEnabled: true,
  lowStockEnabled: true,
  paymentReceivedEnabled: true,
  campaignEndingEnabled: true,
};

const MAINTENANCE_FALLBACK: MaintenanceSettings = {
  enabled: false,
  message:
    "We're currently performing scheduled maintenance. We'll be back shortly — thanks for your patience.",
};

const COMMISSION_FALLBACK: CommissionSettings = {
  enabled: false,
  type: "category_based",
  defaultPercent: 0,
};

async function getGroupValues(group: string): Promise<Map<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("key, value")
    .eq("group_name", group);

  return new Map((data ?? []).map((row) => [row.key, row.value] as const));
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const values = await getGroupValues("general");
  return {
    storeName: (values.get("general.store_name") as string) ?? GENERAL_FALLBACK.storeName,
    tagline: (values.get("general.tagline") as string) ?? GENERAL_FALLBACK.tagline,
    description: (values.get("general.description") as string) ?? GENERAL_FALLBACK.description,
    email: (values.get("general.email") as string) ?? GENERAL_FALLBACK.email,
    phone: (values.get("general.phone") as string) ?? GENERAL_FALLBACK.phone,
    whatsappNumber:
      (values.get("general.whatsapp_number") as string) ?? GENERAL_FALLBACK.whatsappNumber,
    address: (values.get("general.address") as string) ?? GENERAL_FALLBACK.address,
    currency: (values.get("general.currency") as string) ?? GENERAL_FALLBACK.currency,
    timezone: (values.get("general.timezone") as string) ?? GENERAL_FALLBACK.timezone,
    businessHours:
      (values.get("general.business_hours") as BusinessHoursWeek) ??
      GENERAL_FALLBACK.businessHours,
  };
}

export async function getBrandingSettings(): Promise<BrandingSettings> {
  const values = await getGroupValues("branding");
  return {
    logoDesktopUrl:
      (values.get("branding.logo_desktop_url") as string) ?? BRANDING_FALLBACK.logoDesktopUrl,
    logoMobileUrl:
      (values.get("branding.logo_mobile_url") as string) ?? BRANDING_FALLBACK.logoMobileUrl,
    faviconUrl: (values.get("branding.favicon_url") as string) ?? BRANDING_FALLBACK.faviconUrl,
    adminLogoUrl:
      (values.get("branding.admin_logo_url") as string) ?? BRANDING_FALLBACK.adminLogoUrl,
    colorPrimary:
      (values.get("branding.color_primary") as string) ?? BRANDING_FALLBACK.colorPrimary,
    colorAccent: (values.get("branding.color_accent") as string) ?? BRANDING_FALLBACK.colorAccent,
    colorSuccess:
      (values.get("branding.color_success") as string) ?? BRANDING_FALLBACK.colorSuccess,
  };
}

export async function getContactSettings(): Promise<ContactSettings> {
  const values = await getGroupValues("contact");
  return {
    whatsappEnabled:
      (values.get("contact.whatsapp_enabled") as boolean) ?? CONTACT_FALLBACK.whatsappEnabled,
    whatsappDefaultMessage:
      (values.get("contact.whatsapp_default_message") as string) ??
      CONTACT_FALLBACK.whatsappDefaultMessage,
  };
}

export async function getAnnouncementSettings(): Promise<AnnouncementSettings> {
  const values = await getGroupValues("announcement");
  return {
    enabled: (values.get("announcement.enabled") as boolean) ?? ANNOUNCEMENT_FALLBACK.enabled,
    messages:
      (values.get("announcement.messages") as AnnouncementMessage[]) ??
      ANNOUNCEMENT_FALLBACK.messages,
    autoRotate:
      (values.get("announcement.auto_rotate") as boolean) ?? ANNOUNCEMENT_FALLBACK.autoRotate,
    rotateSpeedMs:
      (values.get("announcement.rotate_speed_ms") as number) ??
      ANNOUNCEMENT_FALLBACK.rotateSpeedMs,
  };
}

export async function getHomepageSettings(): Promise<HomepageSettings> {
  const values = await getGroupValues("homepage");
  return {
    heroEnabled: (values.get("homepage.hero_enabled") as boolean) ?? HOMEPAGE_FALLBACK.heroEnabled,
    heroAutoplay:
      (values.get("homepage.hero_autoplay") as boolean) ?? HOMEPAGE_FALLBACK.heroAutoplay,
    heroSlideDurationMs:
      (values.get("homepage.hero_slide_duration_ms") as number) ??
      HOMEPAGE_FALLBACK.heroSlideDurationMs,
    heroShowArrows:
      (values.get("homepage.hero_show_arrows") as boolean) ?? HOMEPAGE_FALLBACK.heroShowArrows,
    heroShowDots:
      (values.get("homepage.hero_show_dots") as boolean) ?? HOMEPAGE_FALLBACK.heroShowDots,
  };
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const values = await getGroupValues("shipping");
  return {
    freeShippingEnabled:
      (values.get("shipping.free_shipping_enabled") as boolean) ?? SHIPPING_FALLBACK.freeShippingEnabled,
    freeShippingMinAmount:
      (values.get("shipping.free_shipping_min_amount") as number) ?? SHIPPING_FALLBACK.freeShippingMinAmount,
    pickupEnabled: (values.get("shipping.pickup_enabled") as boolean) ?? SHIPPING_FALLBACK.pickupEnabled,
    pickupName: (values.get("shipping.pickup_name") as string) ?? SHIPPING_FALLBACK.pickupName,
    pickupAddress: (values.get("shipping.pickup_address") as string) ?? SHIPPING_FALLBACK.pickupAddress,
    pickupInstructions:
      (values.get("shipping.pickup_instructions") as string) ?? SHIPPING_FALLBACK.pickupInstructions,
    pickupHours: (values.get("shipping.pickup_hours") as string) ?? SHIPPING_FALLBACK.pickupHours,
  };
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const values = await getGroupValues("payment");
  return {
    codEnabled: (values.get("payment.cod_enabled") as boolean) ?? PAYMENT_FALLBACK.codEnabled,
    bankTransferEnabled:
      (values.get("payment.bank_transfer_enabled") as boolean) ?? PAYMENT_FALLBACK.bankTransferEnabled,
    onlinePaymentEnabled:
      (values.get("payment.online_payment_enabled") as boolean) ?? PAYMENT_FALLBACK.onlinePaymentEnabled,
  };
}

export async function getPoliciesSettings(): Promise<PoliciesSettings> {
  const values = await getGroupValues("policies");
  return {
    shippingBody: (values.get("policies.shipping_body") as string) ?? POLICIES_FALLBACK.shippingBody,
    returnsBody: (values.get("policies.returns_body") as string) ?? POLICIES_FALLBACK.returnsBody,
    privacyBody: (values.get("policies.privacy_body") as string) ?? POLICIES_FALLBACK.privacyBody,
    termsBody: (values.get("policies.terms_body") as string) ?? POLICIES_FALLBACK.termsBody,
    warrantyBody: (values.get("policies.warranty_body") as string) ?? POLICIES_FALLBACK.warrantyBody,
  };
}

// Additive, policies-only helper -- getGroupValues()/getPoliciesSettings()
// above only select key/value (every other settings group has no use for
// a per-row timestamp), so this is a small separate query rather than
// changing that shared shape for every caller. Returns null if the row
// doesn't exist (falls back to the seed migration's date at the call
// site) -- never fabricates a date.
export async function getPolicyLastUpdated(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("updated_at")
    .eq("key", key)
    .maybeSingle();
  return data?.updated_at ?? null;
}

export async function getSeoSettings(): Promise<SeoSettings> {
  const values = await getGroupValues("seo");
  return {
    siteTitleDefault: (values.get("seo.site_title_default") as string) ?? SEO_FALLBACK.siteTitleDefault,
    titleTemplate: (values.get("seo.title_template") as string) ?? SEO_FALLBACK.titleTemplate,
    metaDescription: (values.get("seo.meta_description") as string) ?? SEO_FALLBACK.metaDescription,
    ogImageUrl: (values.get("seo.og_image_url") as string) ?? SEO_FALLBACK.ogImageUrl,
  };
}

export async function getSocialSettings(): Promise<SocialSettings> {
  const values = await getGroupValues("social");
  return {
    facebookUrl: (values.get("social.facebook_url") as string) ?? SOCIAL_FALLBACK.facebookUrl,
    instagramUrl: (values.get("social.instagram_url") as string) ?? SOCIAL_FALLBACK.instagramUrl,
    tiktokUrl: (values.get("social.tiktok_url") as string) ?? SOCIAL_FALLBACK.tiktokUrl,
    youtubeUrl: (values.get("social.youtube_url") as string) ?? SOCIAL_FALLBACK.youtubeUrl,
    twitterUrl: (values.get("social.twitter_url") as string) ?? SOCIAL_FALLBACK.twitterUrl,
  };
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const values = await getGroupValues("notifications");
  return {
    newOrderEnabled:
      (values.get("notifications.new_order_enabled") as boolean) ?? NOTIFICATIONS_FALLBACK.newOrderEnabled,
    newReviewEnabled:
      (values.get("notifications.new_review_enabled") as boolean) ?? NOTIFICATIONS_FALLBACK.newReviewEnabled,
    newSubscriberEnabled:
      (values.get("notifications.new_subscriber_enabled") as boolean) ??
      NOTIFICATIONS_FALLBACK.newSubscriberEnabled,
    lowStockEnabled:
      (values.get("notifications.low_stock_enabled") as boolean) ?? NOTIFICATIONS_FALLBACK.lowStockEnabled,
    paymentReceivedEnabled:
      (values.get("notifications.payment_received_enabled") as boolean) ??
      NOTIFICATIONS_FALLBACK.paymentReceivedEnabled,
    campaignEndingEnabled:
      (values.get("notifications.campaign_ending_enabled") as boolean) ??
      NOTIFICATIONS_FALLBACK.campaignEndingEnabled,
  };
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const values = await getGroupValues("maintenance");
  return {
    enabled: (values.get("maintenance.enabled") as boolean) ?? MAINTENANCE_FALLBACK.enabled,
    message: (values.get("maintenance.message") as string) ?? MAINTENANCE_FALLBACK.message,
  };
}

// Not called by checkout, create_order_atomic, or any pricing path -- only
// by the Commission Settings admin page itself. See CommissionSettings'
// own doc comment.
export async function getCommissionSettings(): Promise<CommissionSettings> {
  const values = await getGroupValues("commission");
  return {
    enabled: (values.get("commission.enabled") as boolean) ?? COMMISSION_FALLBACK.enabled,
    type: (values.get("commission.type") as "category_based") ?? COMMISSION_FALLBACK.type,
    defaultPercent: (values.get("commission.default_percent") as number) ?? COMMISSION_FALLBACK.defaultPercent,
  };
}

export interface StoreSettingRow {
  key: string;
  value: unknown;
  type: string;
  group_name: string;
  description: string | null;
  updated_at: string;
}

// Admin-facing: every row in a group, raw (used to build/hydrate settings
// forms without a second bespoke query per field).
export async function getSettingsByGroup(group: string): Promise<StoreSettingRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("key, value, type, group_name, description, updated_at")
    .eq("group_name", group)
    .order("key");

  return data ?? [];
}
