import { test } from "node:test";
import assert from "node:assert/strict";
import { getEstimatedDeliveryRange } from "./delivery";

// These assertions are written to fail if the module ever goes back to
// reading the ambient timezone. Run the suite under TZ=UTC as well as
// locally -- the divergence cases below only differ from the correct
// answer when the process is NOT already in Asia/Colombo, which is
// precisely the production situation (Vercel runs UTC).

// 2026-09-22T19:00:00Z is 2026-09-23 00:30 in Colombo: UTC still says the
// 22nd, Sri Lanka has already rolled over to the 23rd. This is the exact
// window the hydration mismatch lived in.
const AFTER_COLOMBO_MIDNIGHT = new Date("2026-09-22T19:00:00Z");
// Same Sri Lankan day, well inside UTC's own 23rd.
const SAME_COLOMBO_DAY_LATER = new Date("2026-09-23T06:00:00Z");

test("the same Sri Lankan day gives the same estimate, whatever UTC says", () => {
  // The server (UTC) and the browser (Asia/Colombo) rendering the same
  // page must produce identical text. Before pinning, these two instants
  // -- both 23 September in Colombo -- produced labels a day apart.
  assert.equal(
    getEstimatedDeliveryRange(AFTER_COLOMBO_MIDNIGHT).label,
    getEstimatedDeliveryRange(SAME_COLOMBO_DAY_LATER).label,
  );
});

test("the estimate is counted from the Sri Lankan day, not the UTC day", () => {
  // Colombo is on Wed 23 Sep. Slow window is 2-4 working days: Thu 24 and
  // Fri 25 are days 1 and 2, then Sat 26 is day 3, Sun 27 is skipped, and
  // Mon 28 is day 4.
  assert.equal(
    getEstimatedDeliveryRange(AFTER_COLOMBO_MIDNIGHT).label,
    "Get it by Fri, Sep 25 – Mon, Sep 28",
  );
  // Counting from UTC's 22nd instead would give "Thu, Sep 24 - Sat, Sep
  // 26" -- which is exactly the pair observed in production, server vs
  // browser, before this was pinned.
  assert.notEqual(
    getEstimatedDeliveryRange(AFTER_COLOMBO_MIDNIGHT).label,
    "Get it by Thu, Sep 24 – Sat, Sep 26",
  );
});

test("a fast zone gets the 1-2 working day window", () => {
  assert.equal(
    getEstimatedDeliveryRange(AFTER_COLOMBO_MIDNIGHT, true).label,
    "Get it by Thu, Sep 24 – Fri, Sep 25",
  );
});

test("Sundays are skipped in both bounds", () => {
  // Colombo is on Sat 26 Sep; the next working day is Mon 28, not Sun 27.
  const saturday = new Date("2026-09-25T20:00:00Z"); // Sat 26 Sep, 01:30 Colombo
  assert.equal(getEstimatedDeliveryRange(saturday, true).label, "Get it by Mon, Sep 28 – Tue, Sep 29");
});

test("midday, when UTC and Colombo agree, is unchanged", () => {
  // A sanity check that pinning did not shift the ordinary case: 10:00Z
  // is 15:30 Colombo, same calendar day either way.
  assert.equal(
    getEstimatedDeliveryRange(new Date("2026-09-22T10:00:00Z"), true).label,
    "Get it by Wed, Sep 23 – Thu, Sep 24",
  );
});

test("the returned dates describe the Sri Lankan day in UTC terms", () => {
  // start/end are UTC midnight of a Sri Lankan day, so a UTC read gives
  // that day back. Anything reading them in local time would drift.
  const { start, end } = getEstimatedDeliveryRange(AFTER_COLOMBO_MIDNIGHT, true);
  assert.equal(start.toISOString(), "2026-09-24T00:00:00.000Z");
  assert.equal(end.toISOString(), "2026-09-25T00:00:00.000Z");
});

test("the boundary instant itself lands on the Sri Lankan side", () => {
  // 18:30Z exactly is 00:00 Colombo the next day.
  const justBefore = getEstimatedDeliveryRange(new Date("2026-09-22T18:29:00Z"), true).label;
  const justAfter = getEstimatedDeliveryRange(new Date("2026-09-22T18:31:00Z"), true).label;
  assert.equal(justBefore, "Get it by Wed, Sep 23 – Thu, Sep 24");
  assert.equal(justAfter, "Get it by Thu, Sep 24 – Fri, Sep 25");
});
