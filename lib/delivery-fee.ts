// Single source of truth for delivery pricing — every surface that shows
// or charges a delivery fee (cart, checkout, order creation, admin/
// customer emails, invoices, the order confirmation page) calls into this
// file. There is no second copy of this logic anywhere in the TS layer;
// create_order_atomic (sql/068) has its own PL/pgSQL mirror, kept in sync
// by hand since Postgres can't import this module — same convention this
// project already used for the earlier city-based regex.
//
// Sri Lanka's real postal system maps Colombo 1-15 to 00100-01500. Pricing
// keys off the postal code, not the free-text city field (which is prone
// to typos/synonyms) — see normalizePostalCode for why the code itself
// must be normalized before comparing.
//
// Rates are now Settings-driven (delivery_zones table, Phase 3) rather
// than hardcoded — every exported function below takes a `zones` array
// (fetched via lib/data/delivery-zones.ts) instead of reading a module
// constant directly. RATE_IN_ZONE/RATE_OUTSIDE_ZONE remain as fallback
// values only, used if the zones table is ever empty/misconfigured, so a
// database hiccup can never break checkout.

export const RATE_IN_ZONE = 255;
export const RATE_OUTSIDE_ZONE = 400;

export type DeliveryMethod = "standard" | "pickup";

export interface DeliveryZone {
  id: string;
  name: string;
  postalCodeStart: string | null;
  postalCodeEnd: string | null;
  districtMatch: string | null;
  rate: number;
  isDefault: boolean;
  // Non-null = an "explicit selection" zone: the customer picks it BY NAME
  // at checkout and it is matched on this key alone, never on a postal
  // range (see matchZone). Null = an ordinary district+postal-range zone.
  // The two kinds are mutually exclusive by construction, here and in
  // create_order_atomic (sql/082).
  zoneKey: string | null;
}

// The dropdown values that are NOT postal codes. Both live here rather
// than in CheckoutAddress.tsx because the pricing rule and the choices
// that feed it have to agree, and the checkout form, the fee preview and
// the order submit all need the same constants -- a copy in a client
// component is exactly how a preview and a charge drift apart.
export const OTHER_COLOMBO_ZONE_VALUE = "OTHER";
export const WELLAMPITIYA_ZONE_KEY = "WELLAMPITIYA";

// Wellampitiya's real postal code: it is served by the Kolonnawa post
// office (10600), nowhere near Colombo 1-15's 00100-01500. That gap is
// the whole reason this town needs an explicit choice -- a customer could
// only reach the Rs 255 rate by guessing their address "counts as"
// Colombo 15. The code is still recorded on the address because the
// courier needs it; it is simply not what decides the price.
export const WELLAMPITIYA_POSTAL_CODE = "10600";

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

// Whether an address falls in the Colombo 1-15 postal range. This is now
// a LABEL rule only -- it decides whether describeDeliveryFee can say
// "Colombo 07" -- and deliberately NOT exported.
//
// It used to be exported and used to decide delivery SPEED too, on the
// assumption that "fast zone" and "Colombo 1-15 postal range" were the
// same set. Wellampitiya broke that: it is priced as a Colombo-rate zone
// via its own zone key but its postal code (10600) is outside the range,
// so the same address came out priced fast and quoted slow. Speed is now
// decided by isFastDeliveryZone below, from the matched zone itself.
function isColomboZoneAddress(district: string, postalCode: string | null | undefined): boolean {
  const normalized = normalizePostalCode(postalCode);
  return district === "Colombo" && normalized !== null && isInColomboRange(normalized);
}

// Same matching algorithm as create_order_atomic's SQL (sql/082), in the
// same order:
//   1. an explicitly-selected zone, matched on zoneKey ALONE;
//   2. otherwise the first active, non-default RANGE zone whose district
//      (if any) and postal range match;
//   3. otherwise the default/catch-all zone;
//   4. otherwise null -- and only then does the caller fall back to the
//      hardcoded RATE_OUTSIDE_ZONE constant, which should never happen
//      with a correctly seeded table.
//
// Step 1 never consults a postal code and step 2 never considers a
// key-based zone. Keeping them strictly separate is the point: a town
// priced by explicit selection must not ALSO be reachable by whatever
// numeric range its real postal code happens to fall into.
function matchZone(
  district: string,
  normalized: string | null,
  zones: DeliveryZone[],
  zoneKey: string | null | undefined,
): DeliveryZone | null {
  if (zoneKey) {
    const byKey = zones.find((zone) => zone.zoneKey === zoneKey);
    if (byKey) return byKey;
    // An unknown or retired key must NOT quietly fall through to whatever
    // the postal code would have matched -- that would re-create the
    // guessing problem this replaced, invisibly. Drop to the default.
    return zones.find((zone) => zone.isDefault) ?? null;
  }

  const specific = zones.find((zone) => {
    if (zone.isDefault) return false;
    if (zone.zoneKey) return false;
    if (zone.districtMatch && zone.districtMatch !== district) return false;
    if (zone.postalCodeStart && zone.postalCodeEnd) {
      return normalized !== null && normalized >= zone.postalCodeStart && normalized <= zone.postalCodeEnd;
    }
    return false;
  });
  if (specific) return specific;
  return zones.find((zone) => zone.isDefault) ?? null;
}

// Turns one checkout dropdown selection into the two separate things the
// rest of the system needs: the key that prices the order, and the postal
// code that goes on the address label. Single source of truth for that
// split, used by the checkout fee preview AND the order submit -- if each
// derived it itself, a DELIVERY_FEE_MISMATCH row is how you would find
// out they had diverged.
export function resolveZoneSelection(selection: string | null | undefined): {
  zoneKey: string | null;
  postalCode: string | null;
} {
  const value = (selection ?? "").trim();
  if (value === WELLAMPITIYA_ZONE_KEY) {
    return { zoneKey: WELLAMPITIYA_ZONE_KEY, postalCode: WELLAMPITIYA_POSTAL_CODE };
  }
  // "Other" is a deliberate "none of these", so it carries no postal code
  // at all -- storing one would be inventing an address detail the
  // customer never gave.
  if (value === OTHER_COLOMBO_ZONE_VALUE) return { zoneKey: null, postalCode: null };
  return { zoneKey: null, postalCode: value || null };
}

// The inverse: a STORED address's postal_code back to the dropdown value
// that represents it. Needed wherever an existing address has to be
// re-priced or re-displayed — the checkout form pre-selecting a saved
// address, and the cart's delivery estimate — because neither has a zone
// key to work from, only whatever was written on the address.
//
// This is the one place a postal code is allowed to imply a key-based
// zone, and only by EXACT equality with that zone's own code (never a
// range). Orders placed from here on carry their zone key explicitly
// (sql/082), so this is for addresses, not for pricing decisions already
// made.
export function zoneSelectionForStoredAddress(
  district: string,
  rawPostalCode: string | null | undefined,
): string {
  const trimmed = (rawPostalCode ?? "").trim();
  if (district !== "Colombo") return trimmed;
  if (!trimmed) return "";
  // A save from before sql/082 could have written the sentinel itself.
  if (trimmed === WELLAMPITIYA_ZONE_KEY) return WELLAMPITIYA_ZONE_KEY;
  const normalized = normalizePostalCode(trimmed);
  if (normalized === WELLAMPITIYA_POSTAL_CODE) return WELLAMPITIYA_ZONE_KEY;
  // normalizePostalCode happily returns codes that are NOT in the
  // dropdown (a Kandy "20000", say), and a <select> handed a value with
  // no matching <option> renders blank — so anything unrecognised has to
  // collapse to the explicit "Other" choice rather than pass through.
  if (normalized && COLOMBO_ZONE_POSTAL_CODES.some((zone) => zone.code === normalized)) {
    return normalized;
  }
  return OTHER_COLOMBO_ZONE_VALUE;
}

// The zone that prices an address -- the SAME match calculateDeliveryFee
// and describeDeliveryFee use, exposed so a caller that needs more than
// the number (the delivery-time estimate) reads it off the zone instead
// of re-deriving it from the fee's display text.
export function resolveDeliveryZone(
  input: {
    district: string;
    postalCode: string | null | undefined;
    zoneKey?: string | null;
    deliveryMethod: DeliveryMethod;
  },
  zones: DeliveryZone[],
): DeliveryZone | null {
  if (input.deliveryMethod === "pickup") return null;
  return matchZone(input.district, normalizePostalCode(input.postalCode), zones, input.zoneKey);
}

// Which zones deliver in 1-2 days rather than 2-4.
//
// The rule is the catch-all: "Other Sri Lanka" is the zone that means
// "anywhere we have no specific arrangement for", and that is the slow
// one. Every zone the store has actually defined -- Colombo 1-15,
// Wellampitiya, and whatever is added next -- is somewhere it delivers
// locally.
//
// Keying off the zone rather than the fee's wording is the point: the
// estimate and the price now come from ONE match, so they cannot
// disagree about the same address the way they did for Wellampitiya
// (priced Colombo, quoted outside-Colombo). A new zone gets a consistent
// pair for free, with no string to remember to update.
//
// If a distant zone is ever added that should keep the slow window --
// say a Jaffna rate -- this is where that becomes a real flag on
// delivery_zones rather than a rule inferred from is_default.
export function isFastDeliveryZone(zone: DeliveryZone | null | undefined): boolean {
  return zone != null && !zone.isDefault;
}

// The delivery rate card, compressed to two lines for the announcement
// bar. Same zones data DeliveryInfoCard reads, so renaming or re-rating a
// zone in Settings moves both, and neither can drift from the other or
// from what checkout charges.
//
// THE SHORTENING RULE, because the bar has one line and the product
// card has a paragraph: the first line names every active non-default
// zone that shares the LOWEST non-default rate. Today that is Colombo
// 1-15 and Wellampitiya, both Rs 255, so it reads
// "Colombo 1-15 & Wellampitiya: Rs 255".
//
// What happens when a fourth zone is added: if it comes in at that same
// lowest rate it is named automatically and nothing else changes. If it
// comes in HIGHER (a Negombo at Rs 300, say) it is deliberately NOT
// named here -- the line stays true, because it only ever claims a rate
// for the zones it lists, but it stops being the complete picture. That
// is the point to either give the bar its own third message kind or
// reword this to "from Rs 255"; the full per-zone list already lives on
// the product page's At a Glance card and in the FAQ. It is a display
// summary only -- nothing prices off it.
export function describeLowestRateZones(zones: DeliveryZone[]): { label: string; rate: number } {
  const named = zones.filter((zone) => !zone.isDefault);
  if (named.length === 0) {
    // Empty/misconfigured table: keep today's copy rather than blank out
    // the bar, same fallback constants as everywhere else in this file.
    return { label: "Colombo 1–15", rate: RATE_IN_ZONE };
  }
  const rate = Math.min(...named.map((zone) => zone.rate));
  const labels = named.filter((zone) => zone.rate === rate).map((zone) => zone.name);
  // "A", "A & B", "A, B & C" -- the serial join keeps three readable
  // without a line break, which is as many as the bar can hold anyway.
  const label =
    labels.length <= 2
      ? labels.join(" & ")
      : `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
  return { label, rate };
}

// The catch-all, named by the zone itself rather than a hardcoded
// "Outside Colombo" -- which had quietly become ambiguous, since
// Wellampitiya is outside Colombo city and yet is NOT on this rate.
export function describeCatchAllZone(zones: DeliveryZone[]): { label: string; rate: number } {
  const fallback = zones.find((zone) => zone.isDefault);
  return { label: fallback?.name ?? "Outside Colombo", rate: fallback?.rate ?? RATE_OUTSIDE_ZONE };
}

export function calculateDeliveryFee(
  input: {
    district: string;
    postalCode: string | null | undefined;
    deliveryMethod: DeliveryMethod;
    // An explicit zone selection, when the customer made one. Takes
    // precedence over postalCode entirely (see matchZone).
    zoneKey?: string | null;
  },
  zones: DeliveryZone[],
): number {
  if (input.deliveryMethod === "pickup") return 0;

  const normalized = normalizePostalCode(input.postalCode);
  const matched = matchZone(input.district, normalized, zones, input.zoneKey);

  // Log only -- the fallback behaviour below is unchanged.
  //
  // matchZone returns the default zone whenever the table is usable, so a
  // null here means the zones array was empty or had no default: either
  // getActiveDeliveryZones() hit an error (it swallows one and returns [])
  // or every zone is inactive. Both are silent failures that quietly swap
  // admin-configured rates for the hardcoded constants below, and the
  // constants currently happen to equal the live rates -- so nothing on
  // screen looks wrong and the substitution is invisible.
  //
  // That is not hypothetical: a delivery zone was accidentally deactivated
  // on 2026-09-21 and the storefront kept displaying the right-looking
  // numbers from these constants, which made the cause very hard to see.
  // This line is the record that would have made it obvious.
  if (!matched) {
    console.warn(
      "[delivery-fee] no usable delivery zone — falling back to hardcoded rates",
      {
        district: input.district,
        postalCode: normalized,
        zoneKey: input.zoneKey ?? null,
        zonesReceived: zones.length,
        activeZoneNames: zones.map((zone) => zone.name),
        fallbackRate: RATE_OUTSIDE_ZONE,
      },
    );
  }

  return matched?.rate ?? RATE_OUTSIDE_ZONE;
}

// Backs the Colombo-zone <select> in CheckoutAddress.tsx — forcing an
// explicit zone (or "Other") choice instead of a free-text field is what
// actually prevents the ambiguous-input bug from reaching checkout in the
// first place; normalizePostalCode above is the defensive backstop for
// data that predates this (saved addresses, guest re-entry), not the
// primary safeguard. This is Sri Lanka's real, fixed postal numbering for
// Colombo 1-15 — not something Settings makes admin-configurable.
export const COLOMBO_ZONE_POSTAL_CODES: { zone: number; code: string; label: string }[] = Array.from(
  { length: 15 },
  (_, i) => {
    const zone = i + 1;
    return { zone, code: zoneToCode(zone)!, label: `Colombo ${String(zone).padStart(2, "0")}` };
  },
);

// Same rule as calculateDeliveryFee, plus a short human-readable "why" —
// used anywhere the customer/admin should see the reasoning (checkout
// summary, order confirmation, emails, invoice), never as the source of
// the charged amount itself (that's always the order's own stored
// shipping_fee, computed once, server-side, at order creation).
//
// The reason text and the fee now derive from the SAME zone match (Phase
// 3) — previously the "Colombo NN"/"Outside Colombo zone" wording was a
// separate hardcoded check; keeping them coupled means an admin-edited
// zone boundary can never make the displayed reason disagree with the
// actual charged rate. This does mean a PAST order's displayed reason
// label can drift if an admin edits zone boundaries later, even though
// its stored, frozen `shipping_fee` amount never changes — a disclosed,
// accepted, cosmetic-only limitation (see Phase 3 plan).
export function describeDeliveryFee(
  input: {
    district: string;
    postalCode: string | null | undefined;
    deliveryMethod: DeliveryMethod;
    zoneKey?: string | null;
  },
  zones: DeliveryZone[],
): { fee: number; reason: string; isFastZone: boolean } {
  if (input.deliveryMethod === "pickup") {
    return { fee: 0, reason: "Store Pickup", isFastZone: false };
  }

  const normalized = normalizePostalCode(input.postalCode);
  const matched = matchZone(input.district, normalized, zones, input.zoneKey);

  // An explicitly-selected zone names itself -- "Wellampitiya", not
  // "Colombo 06" (which its real postal code would otherwise read as) and
  // not "Outside Colombo zone", which is what the customer used to be
  // told while being charged Rs 400 for it.
  const isFastZone = isFastDeliveryZone(matched);

  if (matched?.zoneKey) {
    return { fee: matched.rate, reason: matched.name, isFastZone };
  }
  const isColomboZone = matched != null && !matched.isDefault && isColomboZoneAddress(input.district, input.postalCode);

  if (isColomboZone && normalized) {
    const zone = Number(normalized.slice(1, 3));
    return { fee: matched.rate, reason: `Colombo ${String(zone).padStart(2, "0")}`, isFastZone };
  }
  return { fee: matched?.rate ?? RATE_OUTSIDE_ZONE, reason: "Outside Colombo zone", isFastZone };
}
