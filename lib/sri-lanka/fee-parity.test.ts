import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  OTHER_COLOMBO_ZONE_VALUE,
  WELLAMPITIYA_ZONE_KEY,
  calculateDeliveryFee,
  resolveZoneSelection,
  type DeliveryZone,
} from "@/lib/delivery-fee";
import { ALL_AREAS, areaSelectionValue, areaToAddressFields } from "./areas";

/**
 * THE TEST THAT HAD TO EXIST BEFORE ANY OF THIS SHIPPED.
 *
 * The new area picker replaces a District <select> plus a Colombo-zone
 * <select>. Both old and new end up calling the same calculateDeliveryFee,
 * but they reach it from different inputs -- and one of those inputs,
 * Wellampitiya, is priced on a zone KEY rather than on its postal code
 * (10600, which reads as "outside Colombo"). A picker that filled in the
 * postal code and dropped the key would re-price it from Rs 255 to Rs 400
 * with nothing on screen looking wrong.
 *
 * So: for every case below, the fee the OLD dropdown would have produced
 * and the fee the NEW picker produces are computed independently and
 * asserted equal. If they ever diverge, this fails before a customer is
 * charged the difference.
 */

// The live zone set, mirroring sql/082: two named zones and a catch-all.
// Rates are the ones currently configured; the assertions below compare
// old-vs-new, so they hold whatever the numbers are.
const ZONES: DeliveryZone[] = [
  {
    id: "colombo",
    name: "Colombo 1-15",
    postalCodeStart: "00100",
    postalCodeEnd: "01500",
    districtMatch: "Colombo",
    rate: 255,
    isDefault: false,
    zoneKey: null,
  },
  {
    id: "wellampitiya",
    name: "Wellampitiya",
    postalCodeStart: null,
    postalCodeEnd: null,
    districtMatch: null,
    rate: 255,
    isDefault: false,
    zoneKey: WELLAMPITIYA_ZONE_KEY,
  },
  {
    id: "rest",
    name: "Other Sri Lanka",
    postalCodeStart: null,
    postalCodeEnd: null,
    districtMatch: null,
    rate: 400,
    isDefault: true,
    zoneKey: null,
  },
];

/** The OLD path: a dropdown selection string, through resolveZoneSelection. */
function oldFee(district: string, selection: string): number {
  const { zoneKey, postalCode } = resolveZoneSelection(selection);
  return calculateDeliveryFee({ district, postalCode, zoneKey, deliveryMethod: "standard" }, ZONES);
}

/** The NEW path: a picked area, through the same resolver. */
function newFee(areaDisplayName: string): number {
  const area = ALL_AREAS.find((a) => a.displayName === areaDisplayName);
  assert.ok(area, `area not found in the dataset: ${areaDisplayName}`);
  const fields = areaToAddressFields(area);
  const { zoneKey, postalCode } = resolveZoneSelection(fields.selectionValue);
  return calculateDeliveryFee(
    { district: fields.district, postalCode, zoneKey, deliveryMethod: "standard" },
    ZONES,
  );
}

describe("the new picker charges exactly what the old dropdown charged", () => {
  test("Wellampitiya -- the one priced by zone key, not postal code", () => {
    const before = oldFee("Colombo", WELLAMPITIYA_ZONE_KEY);
    const after = newFee("Wellampitiya");
    assert.equal(after, before, `Wellampitiya: old ${before}, new ${after}`);
    assert.equal(after, 255, "and it must still be the Colombo rate, not 400");
  });

  test("Wellampitiya does NOT price off its real postal code", () => {
    // 10600 alone lands in the catch-all. This is the regression the picker
    // could so easily have introduced.
    assert.equal(oldFee("Colombo", "10600"), 400);
    assert.equal(newFee("Wellampitiya"), 255);
  });

  test("all 15 Colombo zones match, old vs new", () => {
    for (let zone = 1; zone <= 15; zone++) {
      const code = `0${String(zone).padStart(2, "0")}00`;
      const before = oldFee("Colombo", code);
      const area = ALL_AREAS.find(
        (a) => a.district === "Colombo" && a.postalCode === code && /^Colombo \d{2}/.test(a.displayName),
      );
      assert.ok(area, `no area for Colombo ${zone} (${code})`);
      const after = newFee(area.displayName);
      assert.equal(after, before, `Colombo ${zone}: old ${before}, new ${after}`);
      assert.equal(after, 255, `Colombo ${zone} should be the in-zone rate`);
    }
  });

  test("Borella -- in Colombo 1-15 by postal code, reachable by name now", () => {
    // The real win: the old form made a customer know Borella "is" Colombo
    // 08. Typing "borella" must land on the same fee it always charged.
    const before = oldFee("Colombo", "00800");
    const after = newFee("Colombo 08 - Borella");
    assert.equal(after, before);
    assert.equal(after, 255);
  });

  test("a Kandy address -- the catch-all rate", () => {
    const before = oldFee("Kandy", "20000");
    const after = newFee("Kandy");
    assert.equal(after, before, `Kandy: old ${before}, new ${after}`);
    assert.equal(after, 400);
  });
});

describe("the picker never emits a value the resolver mishandles", () => {
  test("only Wellampitiya carries a zone key", () => {
    const withKey = ALL_AREAS.filter((a) => resolveZoneSelection(areaSelectionValue(a)).zoneKey !== null);
    assert.deepEqual(
      withKey.map((a) => a.name),
      ["Wellampitiya"],
      "exactly one area should price on a zone key",
    );
  });

  test("an area with no postal code resolves to no code, not to a guess", () => {
    const none = ALL_AREAS.find((a) => a.postalCode === null);
    assert.ok(none, "expected at least one area with no postal code");
    const { zoneKey, postalCode } = resolveZoneSelection(areaSelectionValue(none));
    assert.equal(zoneKey, null);
    assert.equal(postalCode, null);
    // And it prices at the catch-all, which is the safe answer.
    assert.equal(
      calculateDeliveryFee({ district: none.district, postalCode, zoneKey, deliveryMethod: "standard" }, ZONES),
      400,
    );
  });

  test("no area ever emits the literal string NULL as a postal code", () => {
    const bad = ALL_AREAS.filter((a) => a.postalCode !== null && !/^[0-9]{5}$/.test(a.postalCode));
    assert.deepEqual(bad.map((a) => `${a.name}=${a.postalCode}`), []);
  });

  test("no area emits the OTHER sentinel -- that is a dropdown-only value", () => {
    const sentinel = ALL_AREAS.filter((a) => areaSelectionValue(a) === OTHER_COLOMBO_ZONE_VALUE);
    assert.deepEqual(sentinel.map((a) => a.name), []);
  });

  test("store pickup is free from either path", () => {
    const area = ALL_AREAS.find((a) => a.name === "Wellampitiya")!;
    const { zoneKey, postalCode } = resolveZoneSelection(areaSelectionValue(area));
    assert.equal(
      calculateDeliveryFee({ district: area.district, postalCode, zoneKey, deliveryMethod: "pickup" }, ZONES),
      0,
    );
  });
});

describe("every area is storable in the existing address columns", () => {
  // shipping_addresses (sql/020) and customer_addresses (sql/030) both
  // CHECK district against this exact list. An area that failed this would
  // be a row the database refuses at order time.
  const ALLOWED_DISTRICTS = new Set([
    "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya", "Galle",
    "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar", "Vavuniya",
    "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee", "Kurunegala",
    "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla", "Monaragala",
    "Ratnapura", "Kegalle",
  ]);

  test("every district passes the CHECK constraint", () => {
    const bad = ALL_AREAS.filter((a) => !ALLOWED_DISTRICTS.has(a.district));
    assert.deepEqual([...new Set(bad.map((a) => a.district))], []);
  });

  test("every area has a province, and it is one of the nine", () => {
    const nine = new Set([
      "Western", "Central", "Southern", "Northern", "Eastern",
      "North Western", "North Central", "Uva", "Sabaragamuwa",
    ]);
    const bad = ALL_AREAS.filter((a) => !nine.has(a.province));
    assert.deepEqual([...new Set(bad.map((a) => a.province))], []);
  });

  test("the dataset is the size it was validated at", () => {
    // A tripwire: if a regeneration silently drops rows, this says so.
    assert.equal(ALL_AREAS.length, 2171, "2170 upstream areas + Wellampitiya");
    assert.equal(ALL_AREAS.filter((a) => a.isLocalAddition).length, 1);
  });
});

describe("Commit 2 re-check: the four cases, end to end through the picker", () => {
  // Exactly the set asked for after wiring: a Colombo zone, the zone-key
  // town, a Gampaha town, and a far district.
  const cases: { area: string; expected: number; why: string }[] = [
    { area: "Colombo 08 - Borella", expected: 255, why: "Colombo 1-15 postal range" },
    { area: "Wellampitiya", expected: 255, why: "explicit zone key, NOT its 10600 postal code" },
    { area: "Negombo", expected: 400, why: "Gampaha district, catch-all" },
    { area: "Jaffna", expected: 400, why: "far district, catch-all" },
  ];

  for (const c of cases) {
    test(`${c.area} -> Rs ${c.expected} (${c.why})`, () => {
      const area = ALL_AREAS.find((a) => a.displayName === c.area);
      assert.ok(area, `missing area: ${c.area}`);
      const fields = areaToAddressFields(area);
      const { zoneKey, postalCode } = resolveZoneSelection(fields.selectionValue);
      const fee = calculateDeliveryFee(
        { district: fields.district, postalCode, zoneKey, deliveryMethod: "standard" },
        ZONES,
      );
      assert.equal(fee, c.expected);
      // And the province the picker fills is a real one, ready for sql/104.
      assert.ok(fields.province.length > 0, "province must be filled");
    });
  }
});
