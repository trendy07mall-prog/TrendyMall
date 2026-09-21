import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WELLAMPITIYA_POSTAL_CODE,
  WELLAMPITIYA_ZONE_KEY,
  calculateDeliveryFee,
  describeCatchAllZone,
  describeDeliveryFee,
  describeLowestRateZones,
  isFastDeliveryZone,
  normalizePostalCode,
  resolveDeliveryZone,
  resolveZoneSelection,
  zoneSelectionForStoredAddress,
} from "./delivery-fee";
import type { DeliveryZone } from "./delivery-fee";

// Mirrors the live seed data: sql/068's two range zones (Colombo 1-15 =>
// 255, everything else => 400) plus sql/082's key-based Wellampitiya zone.
const TEST_ZONES: DeliveryZone[] = [
  {
    id: "zone-colombo",
    name: "Colombo 1-15",
    postalCodeStart: "00100",
    postalCodeEnd: "01500",
    districtMatch: "Colombo",
    rate: 255,
    isDefault: false,
    zoneKey: null,
  },
  {
    id: "zone-wellampitiya",
    name: "Wellampitiya",
    postalCodeStart: null,
    postalCodeEnd: null,
    districtMatch: "Colombo",
    rate: 255,
    isDefault: false,
    zoneKey: WELLAMPITIYA_ZONE_KEY,
  },
  {
    id: "zone-default",
    name: "Other Sri Lanka",
    postalCodeStart: null,
    postalCodeEnd: null,
    districtMatch: null,
    rate: 400,
    isDefault: true,
    zoneKey: null,
  },
];

function fee(district: string, postalCode: string | null | undefined) {
  return calculateDeliveryFee({ district, postalCode, deliveryMethod: "standard" }, TEST_ZONES);
}

function feeWithKey(district: string, postalCode: string | null, zoneKey: string | null) {
  return calculateDeliveryFee({ district, postalCode, zoneKey, deliveryMethod: "standard" }, TEST_ZONES);
}

test("Colombo postal codes at the range boundaries price at 255", () => {
  assert.equal(fee("Colombo", "00100"), 255);
  assert.equal(fee("Colombo", "00200"), 255);
  assert.equal(fee("Colombo", "01200"), 255);
  assert.equal(fee("Colombo", "01500"), 255);
});

test("Colombo postal codes just outside the range price at 400", () => {
  assert.equal(fee("Colombo", "01600"), 400);
  assert.equal(fee("Colombo", "10250"), 400);
});

test("non-Colombo districts always price at 400 regardless of postal code", () => {
  assert.equal(fee("Kurunegala", "60000"), 400);
  assert.equal(fee("Galle", "80000"), 400);
  assert.equal(fee("Kandy", "20000"), 400);
});

test("messy real-world input formats all normalize to Colombo 12 (255)", () => {
  for (const input of ["12", "012", "1200", "01200", "Colombo 12", "colombo-12", "00 12 00"]) {
    assert.equal(fee("Colombo", input), 255, `expected ${JSON.stringify(input)} to resolve to 255`);
  }
});

test("empty or missing postal code never grants the Colombo rate", () => {
  assert.equal(fee("Colombo", null), 400);
  assert.equal(fee("Colombo", undefined), 400);
  assert.equal(fee("Colombo", ""), 400);
});

test("Colombo district with a non-Colombo-city postal code prices at 400", () => {
  // Dehiwala and Moratuwa are administratively within Colombo District
  // but outside the Colombo 1-15 postal zone.
  assert.equal(fee("Colombo", "10350"), 400);
  assert.equal(fee("Colombo", "10400"), 400);
});

test("Store Pickup is always free regardless of address", () => {
  assert.equal(
    calculateDeliveryFee({ district: "Colombo", postalCode: "00100", deliveryMethod: "pickup" }, TEST_ZONES),
    0,
  );
  assert.equal(
    calculateDeliveryFee({ district: "Kandy", postalCode: null, deliveryMethod: "pickup" }, TEST_ZONES),
    0,
  );
});

test("an empty/misconfigured zones array falls back to the RATE_OUTSIDE_ZONE constant, never throws", () => {
  assert.equal(
    calculateDeliveryFee({ district: "Colombo", postalCode: "00100", deliveryMethod: "standard" }, []),
    400,
  );
});

test("normalizePostalCode resolves every documented input shape", () => {
  assert.equal(normalizePostalCode("12"), "01200");
  assert.equal(normalizePostalCode("012"), "01200");
  assert.equal(normalizePostalCode("1200"), "01200");
  assert.equal(normalizePostalCode("01200"), "01200");
  assert.equal(normalizePostalCode("Colombo 12"), "01200");
  assert.equal(normalizePostalCode("colombo-12"), "01200");
  assert.equal(normalizePostalCode("00 12 00"), "01200");
  assert.equal(normalizePostalCode("1"), "00100");
  assert.equal(normalizePostalCode("15"), "01500");
  assert.equal(normalizePostalCode("16"), null);
  assert.equal(normalizePostalCode(""), null);
  assert.equal(normalizePostalCode(null), null);
  assert.equal(normalizePostalCode(undefined), null);
});

// ── Wellampitiya: priced by explicit selection, never by postal code ──

test("selecting Wellampitiya prices at the Colombo rate", () => {
  assert.equal(feeWithKey("Colombo", WELLAMPITIYA_POSTAL_CODE, WELLAMPITIYA_ZONE_KEY), 255);
});

test("Wellampitiya's real postal code alone does NOT grant the rate", () => {
  // 10600 is a real postal code well outside 00100-01500, and the
  // key-based zone is deliberately unreachable by range matching -- the
  // rate comes from the explicit choice or not at all. This is the whole
  // separation the change rests on.
  assert.equal(fee("Colombo", WELLAMPITIYA_POSTAL_CODE), 400);
  assert.equal(feeWithKey("Colombo", WELLAMPITIYA_POSTAL_CODE, null), 400);
});

test("an explicit key overrides whatever the postal code would have matched", () => {
  // Even a postal code that WOULD have matched Colombo 1-15 does not get
  // consulted once a key is present -- one input decides, not two.
  assert.equal(feeWithKey("Colombo", "01200", WELLAMPITIYA_ZONE_KEY), 255);
});

test("an unknown zone key falls to the default rate, never through to the postal code", () => {
  // A retired or mistyped key must not silently re-price off the postal
  // code: that would reintroduce the guessing this replaced, invisibly.
  assert.equal(feeWithKey("Colombo", "01200", "NO_SUCH_ZONE"), 400);
});

test("the zone a customer picked names itself in the fee reason", () => {
  assert.equal(
    describeDeliveryFee(
      { district: "Colombo", postalCode: WELLAMPITIYA_POSTAL_CODE, zoneKey: WELLAMPITIYA_ZONE_KEY, deliveryMethod: "standard" },
      TEST_ZONES,
    ).reason,
    "Wellampitiya",
  );
  // Without the key it must NOT claim to be Wellampitiya, and must not
  // read as "Colombo 06" either (10600 normalizes to a 5-digit code whose
  // middle digits would otherwise be read as a zone number).
  assert.equal(
    describeDeliveryFee(
      { district: "Colombo", postalCode: WELLAMPITIYA_POSTAL_CODE, deliveryMethod: "standard" },
      TEST_ZONES,
    ).reason,
    "Outside Colombo zone",
  );
});

// ── The dropdown value <-> stored address round trip ──

test("resolveZoneSelection splits a dropdown value into key and postal code", () => {
  assert.deepEqual(resolveZoneSelection(WELLAMPITIYA_ZONE_KEY), {
    zoneKey: WELLAMPITIYA_ZONE_KEY,
    postalCode: WELLAMPITIYA_POSTAL_CODE,
  });
  // "Other" is a deliberate "none of these" and carries no postal code --
  // storing one would invent an address detail never given.
  assert.deepEqual(resolveZoneSelection("OTHER"), { zoneKey: null, postalCode: null });
  assert.deepEqual(resolveZoneSelection("01200"), { zoneKey: null, postalCode: "01200" });
  assert.deepEqual(resolveZoneSelection(""), { zoneKey: null, postalCode: null });
});

test("a saved address resolves back to the dropdown value that represents it", () => {
  assert.equal(zoneSelectionForStoredAddress("Colombo", WELLAMPITIYA_POSTAL_CODE), WELLAMPITIYA_ZONE_KEY);
  assert.equal(zoneSelectionForStoredAddress("Colombo", "01200"), "01200");
  assert.equal(zoneSelectionForStoredAddress("Colombo", "12"), "01200");
  assert.equal(zoneSelectionForStoredAddress("Colombo", ""), "");
  // Addresses saved before sql/082 can hold the literal sentinel.
  assert.equal(zoneSelectionForStoredAddress("Colombo", "OTHER"), "OTHER");
  assert.equal(zoneSelectionForStoredAddress("Colombo", WELLAMPITIYA_ZONE_KEY), WELLAMPITIYA_ZONE_KEY);
  // A code with no matching <option> must collapse to "Other" rather than
  // pass through and render the <select> blank.
  assert.equal(zoneSelectionForStoredAddress("Colombo", "10350"), "OTHER");
  // Outside Colombo the field is free text, so it passes through as-is.
  assert.equal(zoneSelectionForStoredAddress("Kandy", "20000"), "20000");
});

test("a saved Wellampitiya address round-trips to the Colombo rate", () => {
  // The cart estimate and the checkout form both go through this pair;
  // if they disagreed, a customer would be quoted one rate and charged
  // another.
  const selection = zoneSelectionForStoredAddress("Colombo", WELLAMPITIYA_POSTAL_CODE);
  const resolved = resolveZoneSelection(selection);
  assert.equal(calculateDeliveryFee({ district: "Colombo", ...resolved, deliveryMethod: "standard" }, TEST_ZONES), 255);
});

// ── Delivery speed comes off the matched zone, not the fee's wording ──

function zoneFor(district: string, postalCode: string | null, zoneKey: string | null) {
  return resolveDeliveryZone({ district, postalCode, zoneKey, deliveryMethod: "standard" }, TEST_ZONES);
}

test("a named zone is a fast zone; the catch-all is not", () => {
  assert.equal(isFastDeliveryZone(zoneFor("Colombo", "01200", null)), true);
  assert.equal(isFastDeliveryZone(zoneFor("Colombo", WELLAMPITIYA_POSTAL_CODE, WELLAMPITIYA_ZONE_KEY)), true);
  // "Other", and anywhere outside Colombo, land on the default zone.
  assert.equal(isFastDeliveryZone(zoneFor("Colombo", null, null)), false);
  assert.equal(isFastDeliveryZone(zoneFor("Kandy", "20000", null)), false);
});

test("Wellampitiya is quoted the fast window, the bug this replaced", () => {
  // The old rule asked whether the postal code sat inside Colombo 1-15.
  // Wellampitiya's 10600 does not, so the same address came out priced
  // at the Colombo rate and quoted the slow window.
  const zone = zoneFor("Colombo", WELLAMPITIYA_POSTAL_CODE, WELLAMPITIYA_ZONE_KEY);
  assert.equal(zone?.rate, 255);
  assert.equal(isFastDeliveryZone(zone), true);
});

test("describeDeliveryFee reports price and speed from ONE match", () => {
  // Whatever the reason text says, isFastZone must agree with the rate:
  // that pairing is what stops the estimate drifting from the charge.
  const cases: [string, string | null, string | null, number, boolean][] = [
    ["Colombo", "01200", null, 255, true],
    ["Colombo", "01500", null, 255, true],
    ["Colombo", WELLAMPITIYA_POSTAL_CODE, WELLAMPITIYA_ZONE_KEY, 255, true],
    ["Colombo", null, null, 400, false],
    ["Kandy", "20000", null, 400, false],
  ];
  for (const [district, postalCode, zoneKey, fee, fast] of cases) {
    const got = describeDeliveryFee({ district, postalCode, zoneKey, deliveryMethod: "standard" }, TEST_ZONES);
    assert.equal(got.fee, fee, `${district}/${postalCode}/${zoneKey} fee`);
    assert.equal(got.isFastZone, fast, `${district}/${postalCode}/${zoneKey} isFastZone`);
  }
});

test("Store Pickup is never a fast delivery zone (nothing is delivered)", () => {
  assert.equal(resolveDeliveryZone({ district: "Colombo", postalCode: "01200", deliveryMethod: "pickup" }, TEST_ZONES), null);
  assert.equal(
    describeDeliveryFee({ district: "Colombo", postalCode: "01200", deliveryMethod: "pickup" }, TEST_ZONES).isFastZone,
    false,
  );
});

test("an empty zones table yields no fast zone rather than throwing", () => {
  assert.equal(isFastDeliveryZone(resolveDeliveryZone({ district: "Colombo", postalCode: "01200", deliveryMethod: "standard" }, [])), false);
});

// ── The announcement bar's one-line summary of the rate card ──

test("the bar names every zone sharing the lowest rate", () => {
  const { label, rate } = describeLowestRateZones(TEST_ZONES);
  assert.equal(label, "Colombo 1-15 & Wellampitiya");
  assert.equal(rate, 255);
});

test("a zone at a HIGHER rate is not named -- the line stays true, not complete", () => {
  // The documented shortening rule. A Negombo at Rs 300 does not belong
  // on a line that claims "Rs 255", so it is left off rather than
  // making the bar say something false about it.
  const withNegombo = [
    ...TEST_ZONES,
    {
      id: "zone-negombo", name: "Negombo", postalCodeStart: "11500", postalCodeEnd: "11500",
      districtMatch: "Gampaha", rate: 300, isDefault: false, zoneKey: null,
    },
  ];
  const { label, rate } = describeLowestRateZones(withNegombo);
  assert.equal(label, "Colombo 1-15 & Wellampitiya");
  assert.equal(rate, 255);
});

test("a fourth zone at the SAME lowest rate is named automatically", () => {
  const withKolonnawa = [
    ...TEST_ZONES,
    {
      id: "zone-kolonnawa", name: "Kolonnawa", postalCodeStart: null, postalCodeEnd: null,
      districtMatch: "Colombo", rate: 255, isDefault: false, zoneKey: "KOLONNAWA",
    },
  ];
  // Three or more use a serial join so the line still reads as a list.
  assert.equal(describeLowestRateZones(withKolonnawa).label, "Colombo 1-15, Wellampitiya & Kolonnawa");
});

test("one named zone needs no join", () => {
  const colomboOnly = TEST_ZONES.filter((zone) => zone.zoneKey === null);
  assert.equal(describeLowestRateZones(colomboOnly).label, "Colombo 1-15");
});

test("the catch-all names itself, and both fall back rather than blanking", () => {
  assert.deepEqual(describeCatchAllZone(TEST_ZONES), { label: "Other Sri Lanka", rate: 400 });
  // An empty/misconfigured table must not empty the bar.
  assert.deepEqual(describeLowestRateZones([]), { label: "Colombo 1–15", rate: 255 });
  assert.deepEqual(describeCatchAllZone([]), { label: "Outside Colombo", rate: 400 });
});

test("the bar's summary never contradicts what checkout charges", () => {
  // Every zone named on the lowest-rate line must actually price at that
  // rate through the real matcher -- the bar is a summary of the same
  // table, so a claim it makes has to survive calculateDeliveryFee.
  const { rate } = describeLowestRateZones(TEST_ZONES);
  assert.equal(calculateDeliveryFee({ district: "Colombo", postalCode: "01200", deliveryMethod: "standard" }, TEST_ZONES), rate);
  assert.equal(
    calculateDeliveryFee(
      { district: "Colombo", postalCode: WELLAMPITIYA_POSTAL_CODE, zoneKey: WELLAMPITIYA_ZONE_KEY, deliveryMethod: "standard" },
      TEST_ZONES,
    ),
    rate,
  );
  assert.equal(
    calculateDeliveryFee({ district: "Kandy", postalCode: "20000", deliveryMethod: "standard" }, TEST_ZONES),
    describeCatchAllZone(TEST_ZONES).rate,
  );
});
