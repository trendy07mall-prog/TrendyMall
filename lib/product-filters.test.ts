import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseProductFilterState,
  filterStateToParams,
  toProductListFilters,
  countActiveFilters,
  EMPTY_FILTER_STATE,
} from "./product-filters";

// Scoped to the `campaign` flag specifically -- the gap Phase 5 left when it
// threaded a new filter through these four functions without adding
// coverage, not a full test suite for the pre-existing filter system.
describe("campaign filter flag", () => {
  test("parseProductFilterState reads campaign=1 from the URL", () => {
    const state = parseProductFilterState({ campaign: "1" });
    assert.equal(state.campaign, true);
  });

  test("parseProductFilterState defaults to false when absent", () => {
    const state = parseProductFilterState({});
    assert.equal(state.campaign, false);
  });

  test("parseProductFilterState treats any non-'1' value as false", () => {
    const state = parseProductFilterState({ campaign: "true" });
    assert.equal(state.campaign, false);
  });

  test("filterStateToParams serializes campaign=1 only when true", () => {
    const withCampaign = filterStateToParams({ ...EMPTY_FILTER_STATE, campaign: true });
    assert.equal(withCampaign.get("campaign"), "1");

    const without = filterStateToParams({ ...EMPTY_FILTER_STATE, campaign: false });
    assert.equal(without.has("campaign"), false);
  });

  test("toProductListFilters carries campaign through as-is (true or undefined, never false)", () => {
    const on = toProductListFilters({ ...EMPTY_FILTER_STATE, campaign: true }, [], [], [], []);
    assert.equal(on.campaign, true);

    const off = toProductListFilters({ ...EMPTY_FILTER_STATE, campaign: false }, [], [], [], []);
    assert.equal(off.campaign, undefined);
  });

  test("countActiveFilters includes campaign alongside other active filters", () => {
    assert.equal(countActiveFilters({ ...EMPTY_FILTER_STATE, campaign: true }), 1);
    assert.equal(
      countActiveFilters({ ...EMPTY_FILTER_STATE, campaign: true, onSale: true }),
      2,
    );
    assert.equal(countActiveFilters({ ...EMPTY_FILTER_STATE, campaign: false }), 0);
  });

  test("round-trip: state -> URL params -> parsed state preserves campaign", () => {
    const params = filterStateToParams({ ...EMPTY_FILTER_STATE, campaign: true });
    const parsed = parseProductFilterState(Object.fromEntries(params.entries()));
    assert.equal(parsed.campaign, true);
  });
});
