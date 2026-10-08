/**
 * "Did you mean gmail.com?" for the checkout email field.
 *
 * A wrong email is the one checkout mistake nobody finds out about: the
 * order succeeds, the customer waits for a confirmation that bounced into
 * nowhere, and the shop hears about it as a complaint days later. So a
 * near-miss on a common domain is worth catching while the field is still
 * on screen.
 *
 * Deliberately a SUGGESTION, never a block. The list below cannot know
 * every valid domain, so a typo hint that refused to let you continue
 * would be worse than the typo -- someone with a legitimate address at an
 * unusual domain must always be able to proceed.
 */

/** The domains worth correcting towards: the ones customers here actually use. */
const KNOWN_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "sltnet.lk",
  "protonmail.com",
];

/**
 * Exact near-misses seen in the wild. Checked before the distance test
 * because some of them (gmail.co, gmail.con) are a single edit away from
 * more than one thing, and a lookup is unambiguous where a distance is not.
 */
const COMMON_TYPOS: Record<string, string> = {
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gnail.com": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmai.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlook.con": "outlook.com",
  "outlok.com": "outlook.com",
  "icloud.con": "icloud.com",
};

/** Levenshtein distance, capped -- we only ever care about 1 or 2. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = temp;
    }
  }
  return prev[b.length];
}

/**
 * The corrected address to offer, or null when there is nothing to say.
 *
 * Returns null for an address that is already on a known domain, so a
 * correct "gmail.com" is never second-guessed.
 */
export function suggestEmailCorrection(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) return null;

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local || !domain.includes(".")) return null;

  // Already right -- say nothing.
  if (KNOWN_DOMAINS.includes(domain)) return null;

  const known = COMMON_TYPOS[domain];
  if (known) return `${local}@${known}`;

  for (const candidate of KNOWN_DOMAINS) {
    if (editDistance(domain, candidate) <= 2) return `${local}@${candidate}`;
  }
  return null;
}
