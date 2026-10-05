import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type AdminReviewRow,
  canReply,
  filterReviews,
  needsReply,
  parseReviewFilter,
  summariseReviews,
} from "./reviews-query";

const review = (over: Partial<AdminReviewRow> = {}): AdminReviewRow => ({
  id: "r1",
  status: "approved",
  rating: 5,
  title: "Great earbuds",
  comment: "Works well with my phone.",
  created_at: "2026-10-01T00:00:00Z",
  reply_text: null,
  replied_at: null,
  productId: "p1",
  productName: "TWS Pro Wireless Earbuds",
  productSlug: "tws-pro-wireless-earbuds-charging-case",
  productImage: null,
  reviewerName: "Violet Queen",
  isStaffAuthor: false,
  ...over,
});

// --- who can be replied to -------------------------------------------

test("an approved customer review can be replied to", () => {
  assert.equal(canReply(review()), true);
});

test("a staff-written review can never be replied to", () => {
  // Hidden from the shop entirely (sql/081), so a reply would be written
  // for nobody.
  assert.equal(canReply(review({ isStaffAuthor: true })), false);
  assert.equal(canReply(review({ isStaffAuthor: true, status: "approved" })), false);
});

test("a pending review cannot be replied to", () => {
  assert.equal(canReply(review({ status: "pending" })), false);
});

test("a hidden review cannot be replied to", () => {
  assert.equal(canReply(review({ status: "rejected" })), false);
});

// --- needs reply ------------------------------------------------------

test("an approved customer review with no reply needs one", () => {
  assert.equal(needsReply(review()), true);
});

test("once replied to, it no longer needs a reply", () => {
  assert.equal(needsReply(review({ reply_text: "Thank you!" })), false);
});

test("a whitespace-only reply still counts as needing a reply", () => {
  // The database would accept "   " happily, and it would read worse on a
  // product page than saying nothing at all.
  assert.equal(needsReply(review({ reply_text: "   \n  " })), true);
  assert.equal(needsReply(review({ reply_text: "" })), true);
});

test("staff reviews never appear in needs-reply", () => {
  assert.equal(needsReply(review({ isStaffAuthor: true })), false);
});

test("pending and hidden reviews never appear in needs-reply", () => {
  assert.equal(needsReply(review({ status: "pending" })), false);
  assert.equal(needsReply(review({ status: "rejected" })), false);
});

// --- counts -----------------------------------------------------------

test("counts the four boxes and the tab numbers", () => {
  const rows = [
    review({ id: "a", status: "approved" }),
    review({ id: "b", status: "approved", reply_text: "Thanks!" }),
    review({ id: "c", status: "approved", isStaffAuthor: true }),
    review({ id: "d", status: "pending" }),
    review({ id: "e", status: "rejected" }),
  ];
  const counts = summariseReviews(rows);
  assert.equal(counts.total, 5);
  // Only "a": approved, customer-written, no reply yet.
  assert.equal(counts.needsReply, 1);
  assert.equal(counts.pending, 1);
  assert.equal(counts.approved, 3);
  assert.equal(counts.rejected, 1);
});

test("total includes staff reviews but needsReply does not", () => {
  const rows = [review({ id: "a", isStaffAuthor: true }), review({ id: "b", isStaffAuthor: true })];
  const counts = summariseReviews(rows);
  assert.equal(counts.total, 2);
  assert.equal(counts.needsReply, 0);
});

test("average rating is rounded to one decimal", () => {
  const counts = summariseReviews([review({ rating: 5 }), review({ rating: 4 }), review({ rating: 4 })]);
  assert.equal(counts.averageRating, 4.3);
});

test("average rating is null when there are no reviews, never NaN", () => {
  const counts = summariseReviews([]);
  assert.equal(counts.averageRating, null);
  assert.equal(counts.total, 0);
  assert.equal(counts.needsReply, 0);
});

// --- filtering and search --------------------------------------------

test("each tab selects the right rows", () => {
  const rows = [
    review({ id: "a", status: "approved" }),
    review({ id: "b", status: "pending" }),
    review({ id: "c", status: "rejected" }),
    review({ id: "d", status: "approved", isStaffAuthor: true }),
  ];
  const ids = (f: Parameters<typeof filterReviews>[1]) =>
    filterReviews(rows, f, "").map((r) => r.id);

  assert.deepEqual(ids("all"), ["a", "b", "c", "d"]);
  assert.deepEqual(ids("needs-reply"), ["a"]);
  assert.deepEqual(ids("pending"), ["b"]);
  assert.deepEqual(ids("approved"), ["a", "d"]);
  assert.deepEqual(ids("rejected"), ["c"]);
});

test("search matches review text, reviewer and product name", () => {
  const rows = [
    review({ id: "a", title: "Loud speaker", productName: "KTS 1330" }),
    review({ id: "b", title: "Nice", reviewerName: "Ahmed", productName: "Power Bank" }),
  ];
  assert.deepEqual(filterReviews(rows, "all", "loud").map((r) => r.id), ["a"]);
  assert.deepEqual(filterReviews(rows, "all", "ahmed").map((r) => r.id), ["b"]);
  assert.deepEqual(filterReviews(rows, "all", "power bank").map((r) => r.id), ["b"]);
});

test("search is case-insensitive and a blank query changes nothing", () => {
  const rows = [review({ id: "a", title: "GREAT" })];
  assert.equal(filterReviews(rows, "all", "great").length, 1);
  assert.equal(filterReviews(rows, "all", "   ").length, 1);
});

test("search also looks inside the reply", () => {
  const rows = [review({ id: "a", reply_text: "Sorry to hear that" })];
  assert.deepEqual(filterReviews(rows, "all", "sorry").map((r) => r.id), ["a"]);
});

test("filter and search combine", () => {
  const rows = [
    review({ id: "a", status: "approved", title: "speaker" }),
    review({ id: "b", status: "pending", title: "speaker" }),
  ];
  assert.deepEqual(filterReviews(rows, "needs-reply", "speaker").map((r) => r.id), ["a"]);
});

test("an unknown filter falls back to all rather than showing nothing", () => {
  assert.equal(parseReviewFilter("nonsense"), "all");
  assert.equal(parseReviewFilter(""), "all");
  assert.equal(parseReviewFilter(undefined), "all");
  assert.equal(parseReviewFilter("NEEDS-REPLY"), "needs-reply");
});

test("nothing throws on a missing or wrong-shaped list", () => {
  assert.deepEqual(filterReviews(null as never, "all", ""), []);
  assert.equal(summariseReviews(null as never).total, 0);
});
