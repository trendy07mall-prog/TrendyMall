import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectLowestActiveCampaignPrices } from "./campaigns";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("selectLowestActiveCampaignPrices", () => {
  test("active campaign with future end_at is included", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { end_at: "2026-06-20T00:00:00Z" },
        },
      ],
      NOW,
    );
    assert.deepEqual(result.get("v1"), { campaignId: "c1", campaignPrice: 50 });
  });

  test("active campaign with null end_at is included", () => {
    const result = selectLowestActiveCampaignPrices(
      [{ variant_id: "v1", campaign_price: 50, campaign_id: "c1", campaigns: { end_at: null } }],
      NOW,
    );
    assert.deepEqual(result.get("v1"), { campaignId: "c1", campaignPrice: 50 });
  });

  test("expired campaign (end_at in the past) is excluded", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { end_at: "2026-06-10T00:00:00Z" },
        },
      ],
      NOW,
    );
    assert.equal(result.has("v1"), false);
  });

  test("multiple overlapping active campaigns on the same variant: lowest price wins", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        { variant_id: "v1", campaign_price: 80, campaign_id: "c1", campaigns: { end_at: null } },
        { variant_id: "v1", campaign_price: 40, campaign_id: "c2", campaigns: { end_at: null } },
        { variant_id: "v1", campaign_price: 60, campaign_id: "c3", campaigns: { end_at: null } },
      ],
      NOW,
    );
    assert.deepEqual(result.get("v1"), { campaignId: "c2", campaignPrice: 40 });
  });

  test("variant with no campaign rows at all is absent from the map, not an undefined-valued entry", () => {
    const result = selectLowestActiveCampaignPrices([], NOW);
    assert.equal(result.has("v1"), false);
    assert.equal(result.size, 0);
  });

  test("expired campaign for one variant doesn't affect an active campaign on another", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { end_at: "2026-06-10T00:00:00Z" },
        },
        { variant_id: "v2", campaign_price: 30, campaign_id: "c2", campaigns: { end_at: null } },
      ],
      NOW,
    );
    assert.equal(result.has("v1"), false);
    assert.deepEqual(result.get("v2"), { campaignId: "c2", campaignPrice: 30 });
  });
});
