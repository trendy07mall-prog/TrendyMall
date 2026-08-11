import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { campaignPriceUndercuts } from "./campaign-pricing";

describe("campaignPriceUndercuts", () => {
  test("undercuts the sale price", () => {
    assert.equal(campaignPriceUndercuts(50, 100, 80), true);
  });

  test("undercuts the regular price when there's no sale price", () => {
    assert.equal(campaignPriceUndercuts(70, 100, null), true);
  });

  test("equal to the current price is not a discount", () => {
    assert.equal(campaignPriceUndercuts(80, 100, 80), false);
  });

  test("exceeds the current price", () => {
    assert.equal(campaignPriceUndercuts(90, 100, 80), false);
  });

  test("campaign price of 0 undercuts any positive current price", () => {
    assert.equal(campaignPriceUndercuts(0, 100, 80), true);
  });
});
