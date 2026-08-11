import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getCampaignRuntimeStatus } from "./campaign-status";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("getCampaignRuntimeStatus", () => {
  test("draft short-circuits regardless of dates", () => {
    const result = getCampaignRuntimeStatus(
      { status: "draft", start_at: "2020-01-01T00:00:00Z", end_at: null },
      NOW,
    );
    assert.equal(result, "draft");
  });

  test("disabled short-circuits even for a currently-in-window campaign", () => {
    const result = getCampaignRuntimeStatus(
      { status: "disabled", start_at: "2026-06-01T00:00:00Z", end_at: "2026-07-01T00:00:00Z" },
      NOW,
    );
    assert.equal(result, "disabled");
  });

  test("published, start_at in the future: scheduled", () => {
    const result = getCampaignRuntimeStatus(
      { status: "published", start_at: "2026-06-20T00:00:00Z", end_at: null },
      NOW,
    );
    assert.equal(result, "scheduled");
  });

  test("published, now between start and null end: active", () => {
    const result = getCampaignRuntimeStatus(
      { status: "published", start_at: "2026-06-01T00:00:00Z", end_at: null },
      NOW,
    );
    assert.equal(result, "active");
  });

  test("published, now between start and a future end: active", () => {
    const result = getCampaignRuntimeStatus(
      { status: "published", start_at: "2026-06-01T00:00:00Z", end_at: "2026-06-20T00:00:00Z" },
      NOW,
    );
    assert.equal(result, "active");
  });

  test("published, now past end_at: ended", () => {
    const result = getCampaignRuntimeStatus(
      { status: "published", start_at: "2026-05-01T00:00:00Z", end_at: "2026-06-10T00:00:00Z" },
      NOW,
    );
    assert.equal(result, "ended");
  });

  test("boundary: now exactly equal to start_at counts as started, not scheduled", () => {
    const result = getCampaignRuntimeStatus(
      { status: "published", start_at: NOW.toISOString(), end_at: null },
      NOW,
    );
    assert.equal(result, "active");
  });

  test("boundary: now exactly equal to end_at counts as ended, not active", () => {
    const result = getCampaignRuntimeStatus(
      { status: "published", start_at: "2026-06-01T00:00:00Z", end_at: NOW.toISOString() },
      NOW,
    );
    assert.equal(result, "ended");
  });
});
