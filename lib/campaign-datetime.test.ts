import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sriLankaInputToUtcIso, utcIsoToSriLankaInputValue, getBusinessHoursStatus } from "./campaign-datetime";

describe("sriLankaInputToUtcIso / utcIsoToSriLankaInputValue round-trip", () => {
  test("a Sri Lanka wall-clock value round-trips back to itself", () => {
    const original = "2026-06-15T12:00";
    const utcIso = sriLankaInputToUtcIso(original);
    assert.equal(utcIsoToSriLankaInputValue(utcIso), original);
  });

  test("midnight round-trips correctly", () => {
    const original = "2026-01-01T00:00";
    const utcIso = sriLankaInputToUtcIso(original);
    assert.equal(utcIsoToSriLankaInputValue(utcIso), original);
  });
});

describe("sriLankaInputToUtcIso", () => {
  test("applies the -5:30 offset correctly", () => {
    // Sri Lanka is UTC+5:30, so 12:00 Sri Lanka time is 06:30 UTC.
    assert.equal(sriLankaInputToUtcIso("2026-06-15T12:00"), "2026-06-15T06:30:00.000Z");
  });

  test("empty string returns null", () => {
    assert.equal(sriLankaInputToUtcIso(""), null);
  });

  test("out-of-range date/time components return null, not a garbage date", () => {
    assert.equal(sriLankaInputToUtcIso("2026-13-45T99:99"), null);
  });
});

describe("utcIsoToSriLankaInputValue", () => {
  test("shifts a UTC ISO string forward by 5:30", () => {
    assert.equal(utcIsoToSriLankaInputValue("2026-06-15T06:30:00.000Z"), "2026-06-15T12:00");
  });

  test("null input returns empty string", () => {
    assert.equal(utcIsoToSriLankaInputValue(null), "");
  });
});

// Builds a real Date for a given Sri Lanka wall-clock moment by reusing the
// already-tested sriLankaInputToUtcIso, rather than hand-computing offsets
// a second time in the test itself.
function atSriLankaTime(localValue: string): Date {
  return new Date(sriLankaInputToUtcIso(localValue) as string);
}

describe("getBusinessHoursStatus", () => {
  test("midday: open", () => {
    const result = getBusinessHoursStatus(atSriLankaTime("2026-06-15T12:00"));
    assert.deepEqual(result, { isOpen: true, label: "Open now" });
  });

  test("midnight: closed", () => {
    const result = getBusinessHoursStatus(atSriLankaTime("2026-06-15T00:00"));
    assert.deepEqual(result, { isOpen: false, label: "Opens at 10:00 AM" });
  });

  test("boundary: 09:59 is still closed", () => {
    assert.equal(getBusinessHoursStatus(atSriLankaTime("2026-06-15T09:59")).isOpen, false);
  });

  test("boundary: exactly 10:00 counts as open", () => {
    assert.equal(getBusinessHoursStatus(atSriLankaTime("2026-06-15T10:00")).isOpen, true);
  });

  test("boundary: 15:59 is still open", () => {
    assert.equal(getBusinessHoursStatus(atSriLankaTime("2026-06-15T15:59")).isOpen, true);
  });

  test("boundary: exactly 16:00 counts as closed", () => {
    assert.equal(getBusinessHoursStatus(atSriLankaTime("2026-06-15T16:00")).isOpen, false);
  });
});
