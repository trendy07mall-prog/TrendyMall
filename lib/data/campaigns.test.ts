import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { selectLowestActiveCampaignPrices } from "./campaigns";

const NOW = new Date("2026-06-15T12:00:00Z");
const NO_BADGE = { show_badge: false, badge_label: null };

describe("selectLowestActiveCampaignPrices", () => {
  test("active campaign with future end_at is included", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: "2026-06-20T00:00:00Z", ...NO_BADGE },
        },
      ],
      NOW,
    );
    assert.deepEqual(result.get("v1"), {
      campaignId: "c1",
      campaignPrice: 50,
      badgeLabel: null,
      campaignName: "Campaign 1",
      campaignEndAt: "2026-06-20T00:00:00Z",
    });
  });

  test("active campaign with null end_at is included", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: null, ...NO_BADGE },
        },
      ],
      NOW,
    );
    assert.deepEqual(result.get("v1"), {
      campaignId: "c1",
      campaignPrice: 50,
      badgeLabel: null,
      campaignName: "Campaign 1",
      campaignEndAt: null,
    });
  });

  test("expired campaign (end_at in the past) is excluded", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: "2026-06-10T00:00:00Z", ...NO_BADGE },
        },
      ],
      NOW,
    );
    assert.equal(result.has("v1"), false);
  });

  test("multiple overlapping active campaigns on the same variant: lowest price wins, its own name travels with it", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 80,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: null, ...NO_BADGE },
        },
        {
          variant_id: "v1",
          campaign_price: 40,
          campaign_id: "c2",
          campaigns: { name: "Campaign 2", end_at: null, ...NO_BADGE },
        },
        {
          variant_id: "v1",
          campaign_price: 60,
          campaign_id: "c3",
          campaigns: { name: "Campaign 3", end_at: null, ...NO_BADGE },
        },
      ],
      NOW,
    );
    assert.deepEqual(result.get("v1"), {
      campaignId: "c2",
      campaignPrice: 40,
      badgeLabel: null,
      campaignName: "Campaign 2",
      campaignEndAt: null,
    });
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
          campaigns: { name: "Campaign 1", end_at: "2026-06-10T00:00:00Z", ...NO_BADGE },
        },
        {
          variant_id: "v2",
          campaign_price: 30,
          campaign_id: "c2",
          campaigns: { name: "Campaign 2", end_at: null, ...NO_BADGE },
        },
      ],
      NOW,
    );
    assert.equal(result.has("v1"), false);
    assert.deepEqual(result.get("v2"), {
      campaignId: "c2",
      campaignPrice: 30,
      badgeLabel: null,
      campaignName: "Campaign 2",
      campaignEndAt: null,
    });
  });

  test("show_badge true with a label: badgeLabel is set on the winning row", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: null, show_badge: true, badge_label: "FLASH SALE" },
        },
      ],
      NOW,
    );
    assert.equal(result.get("v1")?.badgeLabel, "FLASH SALE");
  });

  test("show_badge true but empty label: badgeLabel stays null", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: null, show_badge: true, badge_label: null },
        },
      ],
      NOW,
    );
    assert.equal(result.get("v1")?.badgeLabel, null);
  });

  test("show_badge false even with a label: badgeLabel stays null", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: null, show_badge: false, badge_label: "FLASH SALE" },
        },
      ],
      NOW,
    );
    assert.equal(result.get("v1")?.badgeLabel, null);
  });

  test("lowest price wins even when a higher-priced overlapping campaign has the badge", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 80,
          campaign_id: "c1",
          campaigns: { name: "Campaign 1", end_at: null, show_badge: true, badge_label: "FLASH SALE" },
        },
        {
          variant_id: "v1",
          campaign_price: 40,
          campaign_id: "c2",
          campaigns: { name: "Campaign 2", end_at: null, ...NO_BADGE },
        },
      ],
      NOW,
    );
    // The cheaper campaign (c2) wins the price, and its own badge/name state
    // applies -- the pricier campaign's badge/name never leaks through.
    assert.deepEqual(result.get("v1"), {
      campaignId: "c2",
      campaignPrice: 40,
      badgeLabel: null,
      campaignName: "Campaign 2",
      campaignEndAt: null,
    });
  });

  test("campaignName/campaignEndAt are unconditional -- present regardless of show_badge", () => {
    const result = selectLowestActiveCampaignPrices(
      [
        {
          variant_id: "v1",
          campaign_price: 50,
          campaign_id: "c1",
          campaigns: { name: "No Badge Campaign", end_at: "2026-06-25T00:00:00Z", ...NO_BADGE },
        },
      ],
      NOW,
    );
    const info = result.get("v1");
    assert.equal(info?.campaignName, "No Badge Campaign");
    assert.equal(info?.campaignEndAt, "2026-06-25T00:00:00Z");
    assert.equal(info?.badgeLabel, null);
  });
});
