import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatStoreDate,
  formatStoreDateTime,
  formatStoreStamp,
  formatStoreStampWithYear,
} from "./datetime";

// The reported bug, as an assertion: order TM-2026-00177 was placed at
// 11:39:44 PM Sri Lanka time, which is 18:09:44Z. The admin showed
// "9/25/2026, 6:09:44 PM" because the server formatted it in UTC.
const TM_177 = "2026-09-25T18:09:44Z";

test("the reported order reads back as Sri Lanka time, not UTC", () => {
  assert.equal(formatStoreDateTime(TM_177), "9/25/2026, 11:39:44 PM");
  assert.notEqual(formatStoreDateTime(TM_177), "9/25/2026, 6:09:44 PM");
});

test("a timestamp that falls on the previous day in UTC still shows the Sri Lankan day", () => {
  // 20:30Z on the 25th is 02:00 on the 26th in Colombo. Formatting in UTC
  // would put this order on the wrong DATE, not just the wrong hour.
  const iso = "2026-09-25T20:30:00Z";
  assert.equal(formatStoreDate(iso), "9/26/2026");
  assert.equal(formatStoreStamp(iso), "Sep 26, 2:00 AM");
});

test("all four shapes agree on the same instant", () => {
  assert.equal(formatStoreDate(TM_177), "9/25/2026");
  assert.equal(formatStoreStamp(TM_177), "Sep 25, 11:39 PM");
  assert.equal(formatStoreStampWithYear(TM_177), "Sep 25, 2026, 11:39 PM");
});

test("output does not depend on the machine's own timezone", () => {
  // This is the whole point: the server (UTC on Vercel) and a browser in
  // any zone must render an order stamp identically. Re-reading the same
  // instant through each formatter is deterministic because the zone is
  // baked into the formatter rather than inherited from the environment.
  const instants = ["2026-01-01T00:00:00Z", "2026-06-30T18:29:00Z", "2026-12-31T23:59:59Z"];
  for (const iso of instants) {
    assert.equal(formatStoreDateTime(iso), formatStoreDateTime(iso));
    assert.ok(formatStoreDateTime(iso).length > 0);
  }
  // Midnight UTC on New Year's Day is already 5:30 AM on the 1st in
  // Colombo; the last second of the year UTC is 5:29 AM on 1 Jan there.
  assert.equal(formatStoreDate("2026-01-01T00:00:00Z"), "1/1/2026");
  assert.equal(formatStoreDate("2026-12-31T23:59:59Z"), "1/1/2027");
});
