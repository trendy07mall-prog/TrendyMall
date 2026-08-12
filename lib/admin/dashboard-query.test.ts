import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sriLankaDateKey, startOfSriLankaDay, startOfSriLankaMonth } from "./dashboard-query";

// Regression coverage for a real bug found during verification: mixing
// server-LOCAL Date arithmetic (.setDate()/.getDate()) with a UTC-based
// day-key extraction (.toISOString().slice(0,10)) shifted every bucket by
// a day on any host whose local timezone sits ahead of UTC (Sri Lanka
// included) -- the Sales Overview chart's "today" bar was silently
// missing, replaced by a stale extra day at the start of the range.

describe("sriLankaDateKey", () => {
  test("a UTC instant just before the Sri Lanka day boundary belongs to the earlier day", () => {
    // 18:29 UTC = 23:59 Sri Lanka time the same UTC calendar day.
    assert.equal(sriLankaDateKey(new Date("2026-08-12T18:29:00.000Z")), "2026-08-12");
  });

  test("a UTC instant at/after the Sri Lanka day boundary belongs to the next day", () => {
    // 18:30 UTC = 00:00 Sri Lanka time -- already the next Sri Lanka day,
    // even though it's still Aug 12 in UTC.
    assert.equal(sriLankaDateKey(new Date("2026-08-12T18:30:00.000Z")), "2026-08-13");
  });
});

describe("startOfSriLankaDay", () => {
  test("round-trips: the start-of-day instant maps back to the same date key", () => {
    const now = new Date("2026-08-13T09:15:00.000Z");
    const start = startOfSriLankaDay(now);
    assert.equal(sriLankaDateKey(start), sriLankaDateKey(now));
  });

  test("is exactly midnight Sri Lanka time, expressed in UTC", () => {
    const start = startOfSriLankaDay(new Date("2026-08-13T09:15:00.000Z"));
    assert.equal(start.toISOString(), "2026-08-12T18:30:00.000Z");
  });
});

describe("startOfSriLankaMonth", () => {
  test("resolves to the 1st of the Sri Lanka calendar month", () => {
    const start = startOfSriLankaMonth(new Date("2026-08-13T09:15:00.000Z"));
    assert.equal(sriLankaDateKey(start), "2026-08-01");
  });

  test("a UTC instant that's already past the Sri Lanka month boundary rolls to the new month", () => {
    // 18:30 UTC on Jul 31 = 00:00 Sri Lanka time Aug 1.
    const start = startOfSriLankaMonth(new Date("2026-07-31T18:30:00.000Z"));
    assert.equal(sriLankaDateKey(start), "2026-08-01");
  });
});
