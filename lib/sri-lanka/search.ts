/**
 * Type-ahead over the 2,171 areas.
 *
 * Deliberately a plain scan, not an index or a fuzzy-search library. The
 * whole list is ~18 KB gzipped and a pass over 2,171 short strings costs
 * well under a millisecond even on a slow phone -- an index would be more
 * code, more bytes and more to get wrong, for time nobody can perceive.
 *
 * Ranking is the part that matters. Someone typing "colombo" wants the
 * numbered zones first, not Colombo-district suburbs in alphabetical order;
 * someone typing "borella" wants "Colombo 08 - Borella" even though the
 * word does not appear at the start of that label. So matches are scored by
 * WHERE the query lands, not merely whether it lands.
 */

import type { Area } from "./areas";
import { ALL_AREAS } from "./areas";

export const DEFAULT_LIMIT = 8;

/** Collapses case, punctuation and runs of spaces so "colombo-8" ~ "Colombo 8". */
export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lower is better.
 *
 * 0  the whole label starts with the query ("colombo 0" -> Colombo 01)
 * 1  a word inside the label starts with it  ("borella" -> Colombo 08 - Borella)
 * 2  it appears somewhere in the label
 * 3  it appears in the district or province only
 * -1 no match
 */
export function scoreArea(area: Area, query: string): number {
  if (!query) return -1;
  const display = area.displayName.toLowerCase();

  if (display.startsWith(query)) return 0;
  // Word-boundary prefix: the sub-name is what makes "borella" work.
  if (new RegExp(`\\b${escapeRegExp(query)}`).test(display)) return 1;
  if (display.includes(query)) return 2;
  if (area.search.includes(query)) return 3;
  return -1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ranked matches, best first.
 *
 * Ties break on a shorter label, then alphabetically -- so "Kandy" comes
 * before "Kandy Road, Kadawatha" for the query "kandy", which is almost
 * always what was meant.
 */
export function searchAreas(
  rawQuery: string,
  options: { limit?: number; areas?: readonly Area[] } = {},
): Area[] {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) return [];

  const areas = options.areas ?? ALL_AREAS;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const scored: { area: Area; score: number }[] = [];
  for (const area of areas) {
    const score = scoreArea(area, query);
    if (score >= 0) scored.push({ area, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.area.displayName.length !== b.area.displayName.length) {
      return a.area.displayName.length - b.area.displayName.length;
    }
    return a.area.displayName.localeCompare(b.area.displayName, "en");
  });

  return scored.slice(0, limit).map((s) => s.area);
}
