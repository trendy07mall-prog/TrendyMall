import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { planHeroPromo } from "./hero-promo";

const campaign = { desktopBanner: "desktop.jpg", mobileBanner: "mobile.jpg" };
const second = { desktopBanner: "desktop2.jpg", mobileBanner: "mobile2.jpg" };

describe("planHeroPromo", () => {
  test("nothing to show: no promo tiles at all", () => {
    assert.deepEqual(planHeroPromo({ campaigns: [], wideImage: null, compactImage: null }), {
      layout: "none",
      mobile: { campaignImages: [], staticImage: null },
      desktop: { campaignImages: [], staticImage: null },
    });
  });

  test("campaign + static banner: desktop stacks the wide image, the phone row uses the compact one", () => {
    const plan = planHeroPromo({ campaigns: [campaign], wideImage: "wide.jpg", compactImage: "compact.jpg" });
    assert.equal(plan.layout, "both");
    assert.deepEqual(plan.desktop, { campaignImages: ["desktop.jpg"], staticImage: "wide.jpg" });
    assert.deepEqual(plan.mobile, { campaignImages: ["mobile.jpg"], staticImage: "compact.jpg" });
  });

  test("no active campaign: the static banner takes the whole space in the shape made for it", () => {
    const plan = planHeroPromo({ campaigns: [], wideImage: "wide.jpg", compactImage: "compact.jpg" });
    assert.equal(plan.layout, "static");
    assert.deepEqual(plan.desktop, { campaignImages: [], staticImage: "compact.jpg" });
    assert.deepEqual(plan.mobile, { campaignImages: [], staticImage: "wide.jpg" });
  });

  test("compact (8:5) image never set: every static slot falls back to the wide image", () => {
    for (const campaigns of [[campaign], []]) {
      const plan = planHeroPromo({ campaigns, wideImage: "wide.jpg", compactImage: null });
      assert.equal(plan.desktop.staticImage, "wide.jpg");
      assert.equal(plan.mobile.staticImage, "wide.jpg");
    }
  });

  test("only the compact image set: the wide slots use it too", () => {
    for (const campaigns of [[campaign], []]) {
      const plan = planHeroPromo({ campaigns, wideImage: null, compactImage: "compact.jpg" });
      assert.equal(plan.desktop.staticImage, "compact.jpg");
      assert.equal(plan.mobile.staticImage, "compact.jpg");
    }
  });

  test("campaign only: phone strip gets the desktop banner, desktop column gets the mobile banner", () => {
    const plan = planHeroPromo({ campaigns: [campaign], wideImage: null, compactImage: null });
    assert.equal(plan.layout, "campaign");
    assert.deepEqual(plan.mobile, { campaignImages: ["desktop.jpg"], staticImage: null });
    assert.deepEqual(plan.desktop, { campaignImages: ["mobile.jpg"], staticImage: null });
  });

  test("a campaign with only one banner uses it in every campaign slot", () => {
    const onlyMobile = { desktopBanner: null, mobileBanner: "mobile.jpg" };
    for (const wideImage of ["wide.jpg", null]) {
      const plan = planHeroPromo({ campaigns: [onlyMobile], wideImage, compactImage: null });
      assert.equal(plan.desktop.campaignImages[0], "mobile.jpg");
      assert.equal(plan.mobile.campaignImages[0], "mobile.jpg");
    }
  });

  // --- more than one campaign active at the same time --------------------

  test("two active campaigns: one image per campaign, in the order given", () => {
    const plan = planHeroPromo({
      campaigns: [campaign, second],
      wideImage: "wide.jpg",
      compactImage: "compact.jpg",
    });
    assert.equal(plan.layout, "both");
    assert.deepEqual(plan.desktop.campaignImages, ["desktop.jpg", "desktop2.jpg"]);
    assert.deepEqual(plan.mobile.campaignImages, ["mobile.jpg", "mobile2.jpg"]);
    // The static banner beside them is unaffected by how many there are.
    assert.equal(plan.desktop.staticImage, "wide.jpg");
    assert.equal(plan.mobile.staticImage, "compact.jpg");
  });

  test("a second campaign does not change the layout a single one produced", () => {
    for (const images of [
      { wideImage: "wide.jpg", compactImage: "compact.jpg" },
      { wideImage: null, compactImage: null },
    ]) {
      const one = planHeroPromo({ campaigns: [campaign], ...images });
      const two = planHeroPromo({ campaigns: [campaign, second], ...images });
      assert.equal(two.layout, one.layout);
      // ...and the first campaign still resolves to exactly the image it
      // did when it was the only one.
      assert.equal(two.desktop.campaignImages[0], one.desktop.campaignImages[0]);
      assert.equal(two.mobile.campaignImages[0], one.mobile.campaignImages[0]);
    }
  });

  test("each campaign falls back independently when it is missing a banner", () => {
    const plan = planHeroPromo({
      campaigns: [{ desktopBanner: null, mobileBanner: "only-mobile.jpg" }, second],
      wideImage: "wide.jpg",
      compactImage: null,
    });
    assert.deepEqual(plan.desktop.campaignImages, ["only-mobile.jpg", "desktop2.jpg"]);
    assert.deepEqual(plan.mobile.campaignImages, ["only-mobile.jpg", "mobile2.jpg"]);
  });
});
