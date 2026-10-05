import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QUICK_REPLIES,
  REPLY_MAX_LENGTH,
  sanitizeReply,
  validateReply,
} from "./review-reply";

test("ordinary replies pass through unchanged", () => {
  const text = "Thank you for your review. We're glad the earbuds worked out for you.";
  assert.equal(sanitizeReply(text), text);
  assert.deepEqual(validateReply(text), { ok: true, text });
});

test("paragraph breaks survive, because the page renders them", () => {
  assert.equal(sanitizeReply("First line.\n\nSecond line."), "First line.\n\nSecond line.");
});

test("runs of blank lines collapse and trailing spaces go", () => {
  assert.equal(sanitizeReply("One.   \n\n\n\nTwo."), "One.\n\nTwo.");
});

test("http and https links are removed, leaving no double space behind", () => {
  assert.equal(sanitizeReply("See https://evil.example/x now"), "See now");
  assert.ok(!sanitizeReply("Visit http://spam.test/path").includes("spam"));
});

test("a sentence stays readable after a link in the middle is removed", () => {
  assert.equal(
    sanitizeReply("Thanks! Order again at https://example.com/shop any time."),
    "Thanks! Order again at any time.",
  );
});

test("javascript: is removed", () => {
  assert.ok(!sanitizeReply("javascript:alert(1)").includes("javascript"));
});

test("www and bare domains are removed", () => {
  assert.ok(!sanitizeReply("go to www.example.com please").includes("example"));
  assert.ok(!sanitizeReply("check shop.example.co.uk today").includes("example"));
});

test("decimals and version numbers are NOT mistaken for domains", () => {
  // A reply quoting a rating or a spec must survive intact -- these are
  // the strings most likely to look like a domain to a careless regex.
  assert.equal(sanitizeReply("Rated 5.0 by customers"), "Rated 5.0 by customers");
  assert.equal(sanitizeReply("It uses Bluetooth 5.3 and IPX5"), "It uses Bluetooth 5.3 and IPX5");
  assert.equal(sanitizeReply("Delivery is Rs 255.00"), "Delivery is Rs 255.00");
});

test("angle brackets cannot survive, so nothing reads as a tag", () => {
  const out = sanitizeReply("<script>alert(1)</script> hello");
  assert.ok(!out.includes("<"));
  assert.ok(!out.includes(">"));
  assert.ok(out.includes("hello"));
});

test("an image tag cannot smuggle a link through", () => {
  const out = sanitizeReply('<img src="https://evil.test/x.png" onerror="alert(1)">');
  assert.ok(!out.includes("<"));
  assert.ok(!out.includes("evil"));
});

test("a reply made only of links is rejected, not stored blank", () => {
  const result = validateReply("https://evil.example/x");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /empty/i);
});

test("empty and whitespace-only replies are rejected", () => {
  for (const raw of ["", "   ", "\n\n\t"]) {
    const result = validateReply(raw);
    assert.equal(result.ok, false, `"${raw}" should be rejected`);
  }
});

test("exactly 500 characters is allowed", () => {
  const result = validateReply("a".repeat(REPLY_MAX_LENGTH));
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.text.length, REPLY_MAX_LENGTH);
});

test("501 characters is rejected, and the message says the real number", () => {
  const result = validateReply("a".repeat(REPLY_MAX_LENGTH + 1));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /501/);
    assert.match(result.error, /500/);
  }
});

test("length is measured AFTER sanitising, matching the database CHECK", () => {
  // Under the limit only once the link is stripped. The database measures
  // what is stored, so the server action has to measure the same thing or
  // a legal reply would fail on the constraint instead.
  const raw = "a".repeat(480) + " https://example.com/a-very-long-path-that-pushes-it-over";
  assert.ok(raw.length > REPLY_MAX_LENGTH);
  const result = validateReply(raw);
  assert.equal(result.ok, true);
  if (result.ok) assert.ok(result.text.length <= REPLY_MAX_LENGTH);
});

test("every quick reply is usable as-is: non-empty, no links, within the limit", () => {
  assert.equal(QUICK_REPLIES.length, 3);
  assert.deepEqual(
    QUICK_REPLIES.map((q) => q.label),
    ["Thank you", "Sorry to hear that", "Please WhatsApp us"],
  );
  for (const quick of QUICK_REPLIES) {
    const result = validateReply(quick.text);
    assert.equal(result.ok, true, `"${quick.label}" must pass validation`);
    if (result.ok) {
      assert.equal(result.text, quick.text, `"${quick.label}" must survive sanitising unchanged`);
      assert.ok(result.text.length <= REPLY_MAX_LENGTH);
    }
  }
});

test("sanitising is idempotent -- editing a stored reply cannot degrade it", () => {
  const once = sanitizeReply("Thanks! Message us on WhatsApp. Rated 5.0.");
  assert.equal(sanitizeReply(once), once);
});
