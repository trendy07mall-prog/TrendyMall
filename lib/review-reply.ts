/** The hard ceiling on a shop reply, enforced in three places. */
export const REPLY_MAX_LENGTH = 500;

/**
 * The quick-reply buttons offered in the admin reply box. Starting points
 * an admin then edits, not canned responses meant to be posted as-is.
 */
export const QUICK_REPLIES: { label: string; text: string }[] = [
  {
    label: "Thank you",
    text: "Thank you for your review and for shopping with TrendyMall. We're glad the product worked out for you.",
  },
  {
    label: "Sorry to hear that",
    text: "We're sorry this didn't meet your expectations. Please contact us so we can put it right.",
  },
  {
    label: "Please WhatsApp us",
    text: "Thanks for the feedback. Please message us on WhatsApp so we can look into this with you.",
  },
];

/**
 * Turns whatever an admin typed into something safe to store and print on
 * a product page.
 *
 * Three things happen, in this order:
 *
 *   1. **URLs are removed.** Not escaped, removed. A reply is a sentence
 *      to a customer, not a place to publish links, and an admin account
 *      is exactly what an attacker would want in order to put a link on
 *      every product page. Covers bare domains and `javascript:` as well
 *      as http(s), because "trendymall.online" and "www.x.com" are links
 *      to a reader even without a scheme.
 *   2. **Angle brackets are dropped**, so nothing can read as a tag even
 *      if it reaches somewhere that does not escape. React escapes on
 *      render anyway -- this is the second of the two guarantees.
 *   3. **Whitespace is tidied**: runs of blank lines collapse to one, and
 *      trailing spaces go. Paragraph breaks survive, because the product
 *      page renders with whitespace-pre-line.
 *
 * Returns the cleaned string, which may be empty -- the caller decides
 * whether empty means "reject this" or "remove the reply".
 */
export function sanitizeReply(raw: string): string {
  return raw
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\bjavascript:\S*/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    // A bare domain: two or more dot-separated labels ending in a TLD of
    // 2+ letters. Deliberately not matched when preceded by a letter or
    // digit, so "5.0" and version numbers survive while "shop.example.com"
    // does not.
    .replace(/(^|[^\w@.])\b[a-z0-9][\w-]*(\.[a-z0-9][\w-]*)*\.[a-z]{2,}\b(\/\S*)?/gi, "$1")
    .replace(/[<>]/g, "")
    // Removing a link leaves the spaces that surrounded it, so
    // "See https://x now" would otherwise be stored as "See  now".
    // Collapse runs of spaces and tabs -- never newlines, which carry the
    // paragraph breaks the product page renders.
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ReplyValidation =
  | { ok: true; text: string }
  | { ok: false; error: string };

/**
 * The server-side gate. Sanitises first, then judges the RESULT -- so a
 * reply made entirely of links is rejected as empty rather than silently
 * stored as a blank string.
 *
 * The length check is applied after sanitising too: the database CHECK
 * measures what is actually stored, so this has to measure the same thing
 * or the two could disagree and the insert would fail with a constraint
 * error instead of a readable message.
 */
export function validateReply(raw: string): ReplyValidation {
  const text = sanitizeReply(raw);

  if (!text) {
    return { ok: false, error: "Reply can't be empty. Links are not allowed in replies." };
  }
  if (text.length > REPLY_MAX_LENGTH) {
    return {
      ok: false,
      error: `Reply is ${text.length} characters. The limit is ${REPLY_MAX_LENGTH}.`,
    };
  }
  return { ok: true, text };
}
