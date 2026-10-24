import { test } from "node:test";
import assert from "node:assert/strict";
import { isHexColor, sectionInk } from "./section-color";

test("only full #rrggbb hex counts as a colour", () => {
  assert.ok(isHexColor("#dc2626"));
  assert.ok(isHexColor("#1E3A5F"));
  assert.equal(isHexColor("dc2626"), false);
  assert.equal(isHexColor("#fff"), false);
  assert.equal(isHexColor("red; background:url(x)"), false);
});

test("white text on dark or saturated backgrounds, dark text on pale ones", () => {
  assert.equal(sectionInk("#dc2626"), "#ffffff");
  assert.equal(sectionInk("#1e3a5f"), "#ffffff");
  assert.equal(sectionInk("#ffd43b"), "#111111");
  assert.equal(sectionInk("#fef2f2"), "#111111");
});
