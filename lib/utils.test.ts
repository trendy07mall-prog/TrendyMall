import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getVariantPrice, pickWinningVariant, resolveEffectivePriceBand } from "./utils";

describe("getVariantPrice", () => {
  test("no campaign_price: identical to old sale_price ?? regular_price behavior", () => {
    assert.equal(getVariantPrice({ regular_price: 100, sale_price: null }), 100);
    assert.equal(getVariantPrice({ regular_price: 100, sale_price: 80 }), 80);
  });

  test("campaign_price lower than sale: campaign wins", () => {
    assert.equal(getVariantPrice({ regular_price: 100, sale_price: 80, campaign_price: 50 }), 50);
  });

  test("campaign_price higher than sale: sale wins (Math.min ignores it)", () => {
    assert.equal(getVariantPrice({ regular_price: 100, sale_price: 80, campaign_price: 90 }), 80);
  });

  test("campaign_price present, no sale_price: compares against regular_price", () => {
    assert.equal(getVariantPrice({ regular_price: 100, sale_price: null, campaign_price: 70 }), 70);
    assert.equal(getVariantPrice({ regular_price: 100, sale_price: null, campaign_price: 150 }), 100);
  });

  test("explicit campaign_price: null behaves like absent, not like 0", () => {
    assert.equal(getVariantPrice({ regular_price: 100, sale_price: 80, campaign_price: null }), 80);
  });
});

describe("pickWinningVariant", () => {
  test("cheaper effective price wins regardless of sale vs. campaign source", () => {
    const variants = [
      { id: "a", regular_price: 100, sale_price: 90, stock: 5, is_default: false },
      { id: "b", regular_price: 100, sale_price: null, campaign_price: 60, stock: 5, is_default: false },
    ];
    assert.equal(pickWinningVariant(variants).id, "b");
  });

  test("is_default tie-break works across a sale-priced vs. campaign-priced tie", () => {
    const variants = [
      { id: "a", regular_price: 100, sale_price: 70, stock: 5, is_default: false },
      { id: "b", regular_price: 100, sale_price: null, campaign_price: 70, stock: 5, is_default: true },
    ];
    assert.equal(pickWinningVariant(variants).id, "b");
  });

  test("out-of-stock variant with the cheapest campaign price still loses to an in-stock one", () => {
    const variants = [
      { id: "a", regular_price: 100, sale_price: null, stock: 5, is_default: false },
      { id: "b", regular_price: 100, sale_price: null, campaign_price: 10, stock: 0, is_default: false },
    ];
    assert.equal(pickWinningVariant(variants).id, "a");
  });

  test("bad-data edge case (sale_price >= regular_price) still treated as discounted, unchanged behavior", () => {
    const variants = [
      { id: "a", regular_price: 100, sale_price: 120, stock: 5, is_default: false },
      { id: "b", regular_price: 90, sale_price: null, stock: 5, is_default: false },
    ];
    // "a" is in the discounted pool (sale_price != null) even though it doesn't
    // actually undercut regular_price -- pre-existing behavior, unrelated to campaigns.
    assert.equal(pickWinningVariant(variants).id, "a");
  });

  test("no campaign_price anywhere: byte-identical to pre-campaign behavior", () => {
    const variants = [
      { id: "a", regular_price: 100, sale_price: null, stock: 5, is_default: true },
      { id: "b", regular_price: 80, sale_price: null, stock: 5, is_default: false },
    ];
    assert.equal(pickWinningVariant(variants).id, "b");
  });
});

// Exercised indirectly (once per scenario) by resolveCardDisplay's own tests
// in lib/data/products.test.ts, via pickWinningVariant's winner-selection
// first -- these call it directly instead, isolating the band logic itself
// from winner selection.
const NO_EXTRA = { badgeLabel: null, campaignName: null, campaignEndAt: null };

describe("resolveEffectivePriceBand", () => {
  test("no sale, no campaign: regular price, source regular", () => {
    const result = resolveEffectivePriceBand({ regular_price: 100, sale_price: null });
    assert.deepEqual(result, { specialPrice: null, campaignId: null, priceSource: "regular", ...NO_EXTRA });
  });

  test("sale price present, no campaign: sale wins", () => {
    const result = resolveEffectivePriceBand({ regular_price: 100, sale_price: 80 });
    assert.deepEqual(result, { specialPrice: 80, campaignId: null, priceSource: "sale", ...NO_EXTRA });
  });

  test("campaign beats both regular and sale", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: 80,
      campaign_price: 50,
      campaign_id: "c1",
    });
    assert.deepEqual(result, { specialPrice: 50, campaignId: "c1", priceSource: "campaign", ...NO_EXTRA });
  });

  test("campaign beats regular but not sale: sale wins, campaignId null", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: 70,
      campaign_price: 90,
      campaign_id: "c1",
    });
    assert.deepEqual(result, { specialPrice: 70, campaignId: null, priceSource: "sale", ...NO_EXTRA });
  });

  test("exact tie between campaign and sale: sale wins (merchant's own price)", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: 70,
      campaign_price: 70,
      campaign_id: "c1",
    });
    assert.deepEqual(result, { specialPrice: 70, campaignId: null, priceSource: "sale", ...NO_EXTRA });
  });

  test("campaign present, no sale_price at all: compares against regular_price", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: null,
      campaign_price: 60,
      campaign_id: "c1",
    });
    assert.deepEqual(result, { specialPrice: 60, campaignId: "c1", priceSource: "campaign", ...NO_EXTRA });
  });

  test("campaign wins with a badge label: badgeLabel is surfaced", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: 80,
      campaign_price: 50,
      campaign_id: "c1",
      campaign_badge_label: "FLASH SALE",
    });
    assert.deepEqual(result, {
      specialPrice: 50,
      campaignId: "c1",
      priceSource: "campaign",
      badgeLabel: "FLASH SALE",
      campaignName: null,
      campaignEndAt: null,
    });
  });

  test("campaign loses to sale: badge label never leaks through even if present", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: 70,
      campaign_price: 90,
      campaign_id: "c1",
      campaign_badge_label: "FLASH SALE",
    });
    assert.equal(result.badgeLabel, null);
  });

  test("campaign wins with a name and end_at: both are surfaced", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: 80,
      campaign_price: 50,
      campaign_id: "c1",
      campaign_name: "Big Bang Flash Sale",
      campaign_end_at: "2026-06-20T00:00:00Z",
    });
    assert.equal(result.campaignName, "Big Bang Flash Sale");
    assert.equal(result.campaignEndAt, "2026-06-20T00:00:00Z");
  });

  test("campaign loses to sale: name/end_at never leak through either", () => {
    const result = resolveEffectivePriceBand({
      regular_price: 100,
      sale_price: 70,
      campaign_price: 90,
      campaign_id: "c1",
      campaign_name: "Big Bang Flash Sale",
      campaign_end_at: "2026-06-20T00:00:00Z",
    });
    assert.equal(result.campaignName, null);
    assert.equal(result.campaignEndAt, null);
  });
});
