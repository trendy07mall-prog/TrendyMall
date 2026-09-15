import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { planHeroPromo } from "./hero-promo";

const campaign = { desktopBanner: "desktop.jpg", mobileBanner: "mobile.jpg" };

describe("planHeroPromo", () => {
  test("nothing to show: no promo column at all", () => {
    assert.deepEqual(planHeroPromo({ campaign: null, wideImage: null, compactImage: null }), {
      layout: "none",
      campaignImage: null,
      staticImage: null,
    });
  });

  test("campaign + static banner: stacked, campaign desktop banner over the wide image", () => {
    assert.deepEqual(planHeroPromo({ campaign, wideImage: "wide.jpg", compactImage: "compact.jpg" }), {
      layout: "both",
      campaignImage: "desktop.jpg",
      staticImage: "wide.jpg",
    });
  });

  test("no active campaign: the static banner fills the column with the compact (alone) image", () => {
    assert.deepEqual(planHeroPromo({ campaign: null, wideImage: "wide.jpg", compactImage: "compact.jpg" }), {
      layout: "static",
      campaignImage: null,
      staticImage: "compact.jpg",
    });
  });

  test("compact (alone) image never set: the wide image is used in either state", () => {
    for (const c of [campaign, null]) {
      assert.equal(planHeroPromo({ campaign: c, wideImage: "wide.jpg", compactImage: null }).staticImage, "wide.jpg");
    }
  });

  test("only the compact image set: it is used in either state", () => {
    for (const c of [campaign, null]) {
      assert.equal(planHeroPromo({ campaign: c, wideImage: null, compactImage: "compact.jpg" }).staticImage, "compact.jpg");
    }
  });

  test("campaign only: it fills the column with its mobile banner", () => {
    assert.deepEqual(planHeroPromo({ campaign, wideImage: null, compactImage: null }), {
      layout: "campaign",
      campaignImage: "mobile.jpg",
      staticImage: null,
    });
  });

  test("a campaign with only one banner uses it in either state", () => {
    const onlyMobile = { desktopBanner: null, mobileBanner: "mobile.jpg" };
    for (const wideImage of ["wide.jpg", null]) {
      assert.equal(planHeroPromo({ campaign: onlyMobile, wideImage, compactImage: null }).campaignImage, "mobile.jpg");
    }
  });
});
