import type { Book } from '../types';

export type RandomCategory = 'standalone' | 'short' | 'long';

export interface SeriesGroup {
  series: string;
  firstBook: Book;
  books: Book[];
  totalInSeries: number;
}

/** What the Randomize card shows: a standalone book, or a whole series (start with its first book). */
export type RandomPick =
  | { type: 'book'; key: string; book: Book }
  | { type: 'series'; key: string; group: SeriesGroup };

/**
 * Pools ported from the web Randomize page:
 * - only UNREAD books;
 * - a series is eligible only if *every* book in it is unread (don't suggest a half-read series);
 * - series with ≤ 3 books are "short", 4+ are "long".
 */
export function buildRandomPools(books: Book[]) {
  const seriesSizes: Record<string, number> = {};
  const bySeries: Record<string, Book[]> = {};
  for (const b of books) {
    if (!b.seriesName) continue;
    seriesSizes[b.seriesName] = (seriesSizes[b.seriesName] ?? 0) + 1;
    (bySeries[b.seriesName] ??= []).push(b);
  }

  const eligibleSeries = new Set(
    Object.entries(bySeries)
      .filter(([, list]) => list.every((b) => b.status === 'UNREAD'))
      .map(([name]) => name),
  );

  const categorize = (b: Book): RandomCategory =>
    !b.seriesName ? 'standalone' : seriesSizes[b.seriesName] <= 3 ? 'short' : 'long';

  const pools: Record<RandomCategory, Book[]> = { standalone: [], short: [], long: [] };
  for (const b of books) {
    if (b.status !== 'UNREAD') continue;
    if (b.seriesName && !eligibleSeries.has(b.seriesName)) continue;
    pools[categorize(b)].push(b);
  }

  const groupsFor = (cat: 'short' | 'long'): SeriesGroup[] =>
    [...new Set(pools[cat].map((b) => b.seriesName!))]
      .map((series) => {
        // Series order = creation order (the web sorted by id).
        const list = bySeries[series].slice().sort((a, b) => Number(a.id) - Number(b.id));
        return { series, firstBook: list[0], books: list, totalInSeries: seriesSizes[series] };
      })
      .sort((a, b) => a.series.localeCompare(b.series));

  const seriesGroups = { short: groupsFor('short'), long: groupsFor('long') };
  const counts: Record<RandomCategory, number> = {
    standalone: pools.standalone.length,
    short: seriesGroups.short.length,
    long: seriesGroups.long.length,
  };

  return { seriesSizes, pools, seriesGroups, counts };
}

export type RandomPools = ReturnType<typeof buildRandomPools>;

/** All candidates for a category, as picks. */
export function candidatesFor(p: RandomPools, category: RandomCategory): RandomPick[] {
  return category === 'standalone'
    ? p.pools.standalone.map((book) => ({ type: 'book', key: `b-${book.id}`, book }))
    : p.seriesGroups[category].map((group) => ({ type: 'series', key: `s-${group.series}`, group }));
}

/** Random candidate, avoiding an immediate repeat when there's more than one (web: up to 10 tries). */
export function pickRandom(candidates: RandomPick[], lastKey: string | null, random = Math.random): RandomPick | null {
  if (!candidates.length) return null;
  let next: RandomPick;
  let tries = 0;
  do {
    next = candidates[Math.floor(random() * candidates.length)];
    tries++;
  } while (next.key === lastKey && candidates.length > 1 && tries < 10);
  return next;
}
