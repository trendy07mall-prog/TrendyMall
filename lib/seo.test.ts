import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_TITLE_OVERRIDES,
  MAX_TITLE_LENGTH,
  NOINDEX_FOLLOW,
  TITLE_SUFFIX,
  categoryDescriptionFallback,
  categoryTitleSegment,
  trimTitleSegment,
} from "./seo";

const BUDGET = MAX_TITLE_LENGTH - TITLE_SUFFIX.length;

// How long the title actually ends up once Next applies the template.
const rendered = (segment: string) => segment + TITLE_SUFFIX;

test("trimTitleSegment: leaves a short title completely alone", () => {
  assert.equal(trimTitleSegment("New Arrivals"), "New Arrivals");
  assert.equal(trimTitleSegment("Combo Deals"), "Combo Deals");
});

test("trimTitleSegment: strips a suffix the admin already typed in", () => {
  // The live bug: 12 of 20 products rendered "… | TrendyMall | TrendyMall".
  assert.equal(
    trimTitleSegment("5000mAh Magnetic Wireless Power Bank | TrendyMall"),
    "5000mAh Magnetic Wireless Power Bank",
  );
  assert.equal(
    rendered(trimTitleSegment("5000mAh Magnetic Wireless Power Bank | TrendyMall")),
    "5000mAh Magnetic Wireless Power Bank | TrendyMall",
  );
});

test("trimTitleSegment: suffix stripping ignores case and stray spacing", () => {
  assert.equal(trimTitleSegment("TWS Pro Earbuds |   trendymall  "), "TWS Pro Earbuds");
  assert.equal(trimTitleSegment("TWS Pro Earbuds|TRENDYMALL"), "TWS Pro Earbuds");
});

test("trimTitleSegment: strips only ONE trailing suffix, not a real clause", () => {
  // "TrendyMall" appearing mid-title is part of the name, not the suffix.
  assert.equal(
    trimTitleSegment("M10 Bluetooth Earbuds Trendymall | TrendyMall"),
    "M10 Bluetooth Earbuds Trendymall",
  );
});

test("trimTitleSegment: drops whole clauses rather than cutting mid-phrase", () => {
  const raw = "Bluetooth Speakers in Sri Lanka | Portable Wireless Speakers | TrendyMall";
  const out = trimTitleSegment(raw);
  assert.equal(out, "Bluetooth Speakers in Sri Lanka");
  assert.ok(rendered(out).length <= MAX_TITLE_LENGTH);
});

test("trimTitleSegment: keeps as many clauses as fit, in order", () => {
  const out = trimTitleSegment("Lenovo M20 Mini USB Optical Mouse | Compact & Portable");
  assert.equal(out, "Lenovo M20 Mini USB Optical Mouse");
  assert.ok(rendered(out).length <= MAX_TITLE_LENGTH);
});

test("trimTitleSegment: cuts a single long clause at a word boundary", () => {
  // The real 297-character keyword-stuffed meta_title, with no pipes to
  // split on.
  const raw =
    "Hair Trimmer, Professional Hair Trimmer, Rechargeable Hair Trimmer, Cordless Hair Trimmer";
  const out = trimTitleSegment(raw);
  assert.ok(out.length <= BUDGET, `${out.length} > ${BUDGET}`);
  assert.ok(!out.endsWith(" "), "must not end on a space");
  assert.ok(!/[,|\-–—:;]$/.test(out), `must not end on punctuation: ${out}`);
  // Cut at a boundary, so the last word is whole.
  assert.ok(raw.startsWith(out), "must be a prefix of the original");
  assert.ok(raw[out.length] === " " || raw[out.length] === ",", "must break at a word end");
});

test("trimTitleSegment: falls back to a word cut when even the first clause overflows", () => {
  const raw = `${"x".repeat(20)} ${"y".repeat(40)} | Shorter`;
  const out = trimTitleSegment(raw);
  assert.ok(out.length <= BUDGET);
  assert.equal(out, "x".repeat(20));
});

test("trimTitleSegment: every real product title fits after trimming", () => {
  // The live meta_title values that rendered over 60 characters.
  const live = [
    "46pcs 1/4 Inch Socket Set Ratchet Wrench Car Repair Tool Kit",
    "i12 TWS Wireless Earbuds, Bluetooth Earbuds, Wireless Earphones Sri Lanka",
    "KTS 1330 Portable Bluetooth Speaker with Wireless Mic | TrendyMall",
    "Lenovo HE05X Magnetic Neckband Bluetooth Earphones | TrendyMall",
    "M3 Mini Portable Bluetooth Speaker | Wireless Deep Bass | TrendyMall",
    "P9 Wireless Bluetooth Gaming Headphone | Stereo Sound | Deep Bass | TrendyMall",
    "Vendens PB058 10000mAh Fast Charging Power Bank with Built-in Cables",
  ];
  for (const raw of live) {
    const out = trimTitleSegment(raw);
    assert.ok(
      rendered(out).length <= MAX_TITLE_LENGTH,
      `"${out}" renders at ${rendered(out).length}`,
    );
    assert.ok(out.length > 0, `"${raw}" trimmed to nothing`);
    assert.ok(!/\|\s*TrendyMall\s*$/i.test(out), `"${out}" still carries the suffix`);
  }
});

test("categoryTitleSegment: an override wins over the pattern", () => {
  assert.equal(categoryTitleSegment("power-bank", "Power Bank"), "Power Bank Price in Sri Lanka");
  assert.equal(categoryTitleSegment("earbuds", "Earbuds"), "Wireless Earbuds Price in Sri Lanka");
  assert.equal(
    categoryTitleSegment("trimmers-groomers-clippers", "Trimmers, Groomers & Clippers"),
    "Hair Trimmers & Clippers Price in Sri Lanka",
  );
});

test("categoryTitleSegment: Mobile Accessories stays neutral", () => {
  // The homepage owns "mobile accessories Sri Lanka"; this page must not
  // compete for it.
  const out = categoryTitleSegment("mobile-accessories", "Mobile Accessories");
  assert.equal(out, "Mobile Accessories");
  assert.ok(!/price in sri lanka/i.test(out));
});

test("categoryTitleSegment: no override falls back to the keyword pattern", () => {
  assert.equal(categoryTitleSegment("mouse", "Mouse"), "Mouse Price in Sri Lanka");
  assert.equal(categoryTitleSegment("watches", "Watches"), "Watches Price in Sri Lanka");
});

test("categoryTitleSegment: drops the keyword when it would overflow 60", () => {
  const long = "Watches Sunglasses Jewellery And Other Accessories";
  assert.equal(categoryTitleSegment("some-slug", long), long);
});

test("categoryTitleSegment: never produces the old 'Accessories' duplication", () => {
  // "Mobile Accessories Accessories" was live before this change.
  const out = categoryTitleSegment("mobile-accessories", "Mobile Accessories");
  assert.ok(!/Accessories Accessories/i.test(out));
});

test("every category override fits the 60-character budget", () => {
  for (const [slug, segment] of Object.entries(CATEGORY_TITLE_OVERRIDES)) {
    assert.ok(
      rendered(segment).length <= MAX_TITLE_LENGTH,
      `${slug}: "${rendered(segment)}" is ${rendered(segment).length}`,
    );
    assert.ok(
      !/\|\s*TrendyMall/i.test(segment),
      `${slug}: override must not include the suffix, the template adds it`,
    );
  }
});

test("categoryDescriptionFallback: short, and claims only what the shop offers", () => {
  const out = categoryDescriptionFallback("Power Bank");
  assert.equal(out, "Shop Power Bank at TrendyMall. Best prices in Sri Lanka with cash on delivery.");
  assert.ok(out.length <= 155);
  // Nothing about free delivery -- free shipping is disabled in Settings.
  assert.ok(!/free/i.test(out));
});

test("NOINDEX_FOLLOW keeps links crawlable", () => {
  assert.deepEqual(NOINDEX_FOLLOW, { index: false, follow: true });
});
