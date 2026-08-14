import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDeliveryFee, normalizePostalCode } from "./delivery-fee";
import type { DeliveryZone } from "./delivery-fee";

// Mirrors sql/068's exact seed data -- the same 2 zones that reproduce
// today's real live rule (Colombo 1-15 => 255, everything else => 400).
const TEST_ZONES: DeliveryZone[] = [
  {
    id: "zone-colombo",
    name: "Colombo 1-15",
    postalCodeStart: "00100",
    postalCodeEnd: "01500",
    districtMatch: "Colombo",
    rate: 255,
    isDefault: false,
  },
  {
    id: "zone-default",
    name: "Other Sri Lanka",
    postalCodeStart: null,
    postalCodeEnd: null,
    districtMatch: null,
    rate: 400,
    isDefault: true,
  },
];

function fee(district: string, postalCode: string | null | undefined) {
  return calculateDeliveryFee({ district, postalCode, deliveryMethod: "standard" }, TEST_ZONES);
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
