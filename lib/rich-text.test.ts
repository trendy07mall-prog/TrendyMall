import { test } from "node:test";
import assert from "node:assert/strict";

import { optimizeRichTextImages } from "./rich-text";

// The module reads NEXT_PUBLIC_SUPABASE_URL when it is CALLED (not at
// import time), so setting it here covers every test below.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://plotvvkribjecqwqudwh.supabase.co";

const HOST = "https://plotvvkribjecqwqudwh.supabase.co";
const EDITOR_SRC = `${HOST}/storage/v1/object/public/product-images/editor/abc-123.jpg`;

test("a stored editor image is routed through the optimizer, capped and lazy", () => {
  const out = optimizeRichTextImages(`<p>Hi</p><img src="${EDITOR_SRC}" alt="Box contents">`);
  assert.ok(out.includes("<p>Hi</p>"), "surrounding markup is untouched");
  assert.ok(out.includes('loading="lazy"'));
  assert.ok(out.includes('decoding="async"'));
  assert.ok(out.includes('alt="Box contents"'), "alt is preserved");
  // The widest candidate is the cap, not the original.
  assert.ok(out.includes("w=828"));
  assert.ok(!out.includes("w=1080") && !out.includes("w=1920"), "never offers a width above the cap");
  // The raw storage URL must not survive as a plain src.
  assert.ok(!new RegExp(`src="${EDITOR_SRC}"`).test(out), "original full-size URL is no longer the src");
});

test("it offers a real srcset so small screens take a smaller decode", () => {
  const out = optimizeRichTextImages(`<img src="${EDITOR_SRC}" alt="">`);
  for (const w of [384, 640, 828]) {
    assert.ok(out.includes(`&w=${w}&q=75 ${w}w`), `srcset offers ${w}w`);
  }
  assert.ok(out.includes('sizes="(max-width: 820px) calc(100vw - 48px), 772px"'));
});

test("the source URL is encoded, not pasted raw into the query string", () => {
  const out = optimizeRichTextImages(`<img src="${EDITOR_SRC}" alt="">`);
  assert.ok(out.includes(encodeURIComponent(EDITOR_SRC)));
});

test("a foreign host is left as-is apart from the loading hints", () => {
  // Rewriting this would produce a 400 from the optimizer: next.config's
  // remotePatterns only allows our own storage host.
  const foreign = '<img src="https://images.example.com/promo.jpg" alt="x">';
  const out = optimizeRichTextImages(foreign);
  assert.ok(out.includes('src="https://images.example.com/promo.jpg"'), "src is untouched");
  assert.ok(!out.includes("/_next/image"), "not routed through the optimizer");
  assert.ok(out.includes('loading="lazy"'), "still must not decode before it is scrolled to");
  assert.ok(out.includes('decoding="async"'));
});

test("a relative or malformed src is never guessed at", () => {
  for (const src of ["/images/local.jpg", "not a url", ""]) {
    const out = optimizeRichTextImages(`<img src="${src}" alt="">`);
    assert.ok(!out.includes("/_next/image"), `${JSON.stringify(src)} is not rewritten`);
    assert.ok(out.includes('loading="lazy"'), `${JSON.stringify(src)} still gets lazy loading`);
  }
});

test("a non-storage path on the right host is not rewritten either", () => {
  // Only /storage/v1/object/public/** is in remotePatterns.
  const out = optimizeRichTextImages(`<img src="${HOST}/some/other/path.jpg" alt="">`);
  assert.ok(!out.includes("/_next/image"));
});

test("existing loading/decoding attributes are not duplicated", () => {
  const out = optimizeRichTextImages('<img src="/local.jpg" loading="eager" decoding="sync" alt="">');
  assert.equal((out.match(/loading=/g) ?? []).length, 1);
  assert.equal((out.match(/decoding=/g) ?? []).length, 1);
  assert.ok(out.includes('loading="eager"'), "an explicit choice is respected, not overwritten");
});

test("several images in one description are all rewritten", () => {
  const html = [1, 2, 3, 4]
    .map((n) => `<p>Step ${n}</p><img src="${HOST}/storage/v1/object/public/product-images/editor/${n}.jpg" alt="s${n}">`)
    .join("");
  const out = optimizeRichTextImages(html);
  assert.equal((out.match(/\/_next\/image/g) ?? []).length, 4 * 3 + 4, "4 images x (3 srcset + 1 src)");
  for (const n of [1, 2, 3, 4]) assert.ok(out.includes(`alt="s${n}"`));
});

test("html with no images is returned byte-for-byte", () => {
  const html = "<p>Just <strong>text</strong> and a <a href=\"/x\">link</a>.</p>";
  assert.equal(optimizeRichTextImages(html), html);
});

test("empty input is handled without throwing", () => {
  assert.equal(optimizeRichTextImages(""), "");
  assert.equal(optimizeRichTextImages(null), "");
  assert.equal(optimizeRichTextImages(undefined), "");
});

test("an escaped alt is not double-encoded", () => {
  // sanitize-html already stored this escaped; re-escaping would show
  // "&amp;amp;" to the customer.
  const out = optimizeRichTextImages(`<img src="${EDITOR_SRC}" alt="Tools &amp; parts">`);
  assert.ok(out.includes('alt="Tools &amp; parts"'));
  assert.ok(!out.includes("&amp;amp;"));
});

test("an img with no alt still produces a valid tag", () => {
  const out = optimizeRichTextImages(`<img src="${EDITOR_SRC}">`);
  assert.ok(out.includes('alt=""'), "empty alt rather than a missing attribute");
});
