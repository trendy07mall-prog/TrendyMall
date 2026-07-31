// Single source of truth for delivery pricing — every surface that shows
// or charges a delivery fee (cart, checkout, order creation, admin/
// customer emails, invoices, the order confirmation page) calls into this
// file. There is no second copy of this logic anywhere in the TS layer;
// create_order_atomic (sql/038) has its own PL/pgSQL mirror, kept in sync
// by hand since Postgres can't import this module — same convention this
// project already used for the earlier city-based regex.
//
// Sri Lanka's real postal system maps Colombo 1-15 to 00100-01500. Pricing
// keys off the postal code, not the free-text city field (which is prone
// to typos/synonyms) — see normalizePostalCode for why the code itself
// must be normalized before comparing.

export const RATE_IN_ZONE = 255;
export const RATE_OUTSIDE_ZONE = 400;

export type DeliveryMethod = "standard" | "pickup";

function zoneToCode(zone: number): string | null {
  if (zone < 1 || zone > 15) return null;
  return `0${String(zone).padStart(2, "0")}00`;
}

// Accepts a bare zone number ("12", "012"), a 4-digit short code
// ("1200"), a full 5-digit code ("01200"), or a noisy variant
// ("Colombo 12", "colombo-12", "00 12 00") and maps all of them to the
// same canonical 5-digit string. Returns null for anything that can't be
// confidently resolved — callers must treat null as "not a confirmed
// Colombo zone" (the safe default), never guess further.
export function normalizePostalCode(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const withoutLabel = raw.trim().toLowerCase().replace(/^colombo[\s-]*/, "");
  const digits = withoutLabel.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length <= 3) {
    return zoneToCode(Number(digits));
  }
  if (digits.length === 4) {
    return `0${digits}`;
  }
  if (digits.length === 5) {
    return digits;
  }

  // Longer/malformed input (e.g. stray extra zeros like "00 12 00" ->
  // "001200") — try stripping leading zeros down to a recognizable
  // 4-or-5-digit code before giving up; never guess beyond that.
  const stripped = digits.replace(/^0+/, "");
  if (stripped.length === 4) return `0${stripped}`;
  if (stripped.length === 5) return stripped;
  if (stripped.length > 0 && stripped.length <= 3) {
    return zoneToCode(Number(stripped));
  }
  return null;
}

// Same-length (5-char), digit-only strings compare identically under
// string and numeric comparison — this is what makes plain string
// comparison here safe, and is exactly why normalization always pads to
// 5 digits: comparing unpadded values as strings ("100" vs "1500") or as
// parsed integers ("00100" -> 100) both break in different ways.
function isInColomboRange(normalized: string): boolean {
  return normalized >= "00100" && normalized <= "01500";
}

export function calculateDeliveryFee(input: {
  district: string;
  postalCode: string | null | undefined;
  deliveryMethod: DeliveryMethod;
}): number {
  if (input.deliveryMethod === "pickup") return 0;

  const normalized = normalizePostalCode(input.postalCode);
  if (input.district === "Colombo" && normalized !== null && isInColomboRange(normalized)) {
    return RATE_IN_ZONE;
  }
  return RATE_OUTSIDE_ZONE;
}

// Same rule as calculateDeliveryFee, plus a short human-readable "why" —
// used anywhere the customer/admin should see the reasoning (checkout
// summary, order confirmation, emails, invoice), never as the source of
// the charged amount itself (that's always the order's own stored
// shipping_fee, computed once, server-side, at order creation).
// Backs the Colombo-zone <select> in CheckoutAddress.tsx — forcing an
// explicit zone (or "Other") choice instead of a free-text field is what
// actually prevents the ambiguous-input bug from reaching checkout in the
// first place; normalizePostalCode above is the defensive backstop for
// data that predates this (saved addresses, guest re-entry), not the
// primary safeguard.
export const COLOMBO_ZONE_POSTAL_CODES: { zone: number; code: string; label: string }[] = Array.from(
  { length: 15 },
  (_, i) => {
    const zone = i + 1;
    return { zone, code: zoneToCode(zone)!, label: `Colombo ${String(zone).padStart(2, "0")}` };
  },
);

export function describeDeliveryFee(input: {
  district: string;
  postalCode: string | null | undefined;
  deliveryMethod: DeliveryMethod;
}): { fee: number; reason: string } {
  if (input.deliveryMethod === "pickup") {
    return { fee: 0, reason: "Store Pickup" };
  }

  const normalized = normalizePostalCode(input.postalCode);
  if (input.district === "Colombo" && normalized !== null && isInColomboRange(normalized)) {
    const zone = Number(normalized.slice(1, 3));
    return { fee: RATE_IN_ZONE, reason: `Colombo ${String(zone).padStart(2, "0")}` };
  }
  return { fee: RATE_OUTSIDE_ZONE, reason: "Outside Colombo zone" };
}
