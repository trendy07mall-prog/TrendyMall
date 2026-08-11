import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveCardDisplay } from "./products";
import type { VariantPriceRow } from "./products";

function variant(overrides: Partial<VariantPriceRow> & { id: string }): VariantPriceRow {
  return {
    product_id: "p1",
    regular_price: 100,
    sale_price: null,
    stock: 5,
    is_default: false,
    variant_image_url: null,
    ...overrides,
  };
}

describe("resolveCardDisplay", () => {
  test("no sale price, no campaign: regular price, no discount", () => {
    const display = resolveCardDisplay([variant({ id: "v1" })]);
    assert.equal(display.actualPrice, 100);
    assert.equal(display.specialPrice, null);
    assert.equal(display.priceSource, "regular");
    assert.equal(display.campaignId, null);
    assert.equal(display.discountPercent, null);
  });

  test("sale price present, no campaign: sale wins", () => {
    const display = resolveCardDisplay([variant({ id: "v1", sale_price: 80 })]);
    assert.equal(display.actualPrice, 100);
    assert.equal(display.specialPrice, 80);
    assert.equal(display.priceSource, "sale");
    assert.equal(display.campaignId, null);
    assert.equal(display.discountPercent, 20);
  });

  test("campaign lower than sale: campaign wins", () => {
    const display = resolveCardDisplay([
      variant({ id: "v1", sale_price: 80, campaign_price: 50, campaign_id: "c1" }),
    ]);
    assert.equal(display.specialPrice, 50);
    assert.equal(display.priceSource, "campaign");
    assert.equal(display.campaignId, "c1");
    assert.equal(display.discountPercent, 50);
  });

  test("campaign higher than sale: sale wins, campaignId null", () => {
    const display = resolveCardDisplay([
      variant({ id: "v1", sale_price: 80, campaign_price: 90, campaign_id: "c1" }),
    ]);
    assert.equal(display.specialPrice, 80);
    assert.equal(display.priceSource, "sale");
    assert.equal(display.campaignId, null);
  });

  test("campaign present, no sale price", () => {
    const display = resolveCardDisplay([variant({ id: "v1", campaign_price: 70, campaign_id: "c1" })]);
    assert.equal(display.specialPrice, 70);
    assert.equal(display.priceSource, "campaign");
    assert.equal(display.campaignId, "c1");
  });

  test("campaign tied with sale price: sale wins the tie (merchant's own price, same number)", () => {
    const display = resolveCardDisplay([
      variant({ id: "v1", sale_price: 60, campaign_price: 60, campaign_id: "c1" }),
    ]);
    assert.equal(display.specialPrice, 60);
    assert.equal(display.priceSource, "sale");
    assert.equal(display.campaignId, null);
  });

  test("hasMultiplePrices true purely from a campaign-price difference", () => {
    const display = resolveCardDisplay([
      variant({ id: "v1", regular_price: 100, sale_price: null }),
      variant({ id: "v2", regular_price: 100, sale_price: null, campaign_price: 70, campaign_id: "c1" }),
    ]);
    assert.equal(display.hasMultiplePrices, true);
  });

  test("identically priced variants (no campaign anywhere): hasMultiplePrices false", () => {
    const display = resolveCardDisplay([
      variant({ id: "v1", regular_price: 100 }),
      variant({ id: "v2", regular_price: 100 }),
    ]);
    assert.equal(display.hasMultiplePrices, false);
  });
});
