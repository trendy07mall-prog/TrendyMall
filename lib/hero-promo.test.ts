import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { planHeroPromo } from "./hero-promo";

const campaign = { desktopBanner: "desktop.jpg", mobileBanner: "mobile.jpg" };

describe("planHeroPromo", () => {
  test("nothing to show: no promo tiles at all", () => {
    assert.deepEqual(planHeroPromo({ campaign: null, wideImage: null, compactImage: null }), {
      layout: "none",
      mobile: { campaignImage: null, staticImage: null },
      desktop: { campaignImage: null, staticImage: null },
    });
  });

  test("campaign + static banner: desktop stacks the wide image, the phone row uses the compact one", () => {
    const plan = planHeroPromo({ campaign, wideImage: "wide.jpg", compactImage: "compact.jpg" });
    assert.equal(plan.layout, "both");
    assert.deepEqual(plan.desktop, { campaignImage: "desktop.jpg", staticImage: "wide.jpg" });
    assert.deepEqual(plan.mobile, { campaignImage: "mobile.jpg", staticImage: "compact.jpg" });
  });

  test("no active campaign: the static banner takes the whole space in the shape made for it", () => {
    const plan = planHeroPromo({ campaign: null, wideImage: "wide.jpg", compactImage: "compact.jpg" });
    assert.equal(plan.layout, "static");
    assert.deepEqual(plan.desktop, { campaignImage: null, staticImage: "compact.jpg" });
    assert.deepEqual(plan.mobile, { campaignImage: null, staticImage: "wide.jpg" });
  });

  test("compact (8:5) image never set: every static slot falls back to the wide image", () => {
    for (const c of [campaign, null]) {
      const plan = planHeroPromo({ campaign: c, wideImage: "wide.jpg", compactImage: null });
      assert.equal(plan.desktop.staticImage, "wide.jpg");
      assert.equal(plan.mobile.staticImage, "wide.jpg");
    }
  });

  test("only the compact image set: the wide slots use it too", () => {
    for (const c of [campaign, null]) {
      const plan = planHeroPromo({ campaign: c, wideImage: null, compactImage: "compact.jpg" });
      assert.equal(plan.desktop.staticImage, "compact.jpg");
      assert.equal(plan.mobile.staticImage, "compact.jpg");
    }
  });

  test("campaign only: phone strip gets the desktop banner, desktop column gets the mobile banner", () => {
    const plan = planHeroPromo({ campaign, wideImage: null, compactImage: null });
    assert.equal(plan.layout, "campaign");
    assert.deepEqual(plan.mobile, { campaignImage: "desktop.jpg", staticImage: null });
    assert.deepEqual(plan.desktop, { campaignImage: "mobile.jpg", staticImage: null });
  });

  test("a campaign with only one banner uses it in every campaign slot", () => {
    const onlyMobile = { desktopBanner: null, mobileBanner: "mobile.jpg" };
    for (const wideImage of ["wide.jpg", null]) {
      const plan = planHeroPromo({ campaign: onlyMobile, wideImage, compactImage: null });
      assert.equal(plan.desktop.campaignImage, "mobile.jpg");
      assert.equal(plan.mobile.campaignImage, "mobile.jpg");
    }
  });
});
