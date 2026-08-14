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
