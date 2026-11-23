// Metrics "period": all time or one year, and how a year compares with the one before.
// Mirrors utility-hub-ui's domains/library/utils/period.js.
import { isoYear, todayIso } from '@/lib/dates';
import type { Book } from '../types';

type Finished = Book & { endDate: string };
const finished = (books: Book[]) => books.filter((b): b is Finished => b.status === 'READ' && !!b.endDate);

/** Years with finished books, newest first, always including this year (for the picker). */
export function periodYears(books: Book[], today = todayIso()): number[] {
  const years = new Set(finished(books).map((b) => isoYear(b.endDate)));
  years.add(isoYear(today));
  return [...years].sort((a, b) => b - a);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface PeriodTotals {
  books: number;
  pages: number;
  avgPages: number | null;
  avgRating: number | null;
}

function summarize(list: Finished[]): PeriodTotals {
  const pages = list.reduce((s, b) => s + (b.pages || 0), 0);
  const rated = list.filter((b) => b.rating);
  return {
    books: list.length,
    pages,
    avgPages: list.length ? Math.round(pages / list.length) : null,
    avgRating: rated.length ? round1(rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length) : null,
  };
}

const diff = (a: number | null, b: number | null) => (a == null || b == null ? null : a - b);

export interface PeriodStats extends PeriodTotals {
  vs: { books: number; pages: number; avgPages: number | null; avgRating: number | null } | null;
}

/**
 * Books, pages, average pages and average rating for all time (`year` null) or one year. A year
 * also gets `vs`, the change from the whole year before; for the current year that's "so far vs
 * all of last year". `vs` is null when the year before has no finished books.
 */
export function periodStats(books: Book[], year: number | null): PeriodStats {
  const done = finished(books);
  if (year == null) return { ...summarize(done), vs: null };

  const stats = summarize(done.filter((b) => isoYear(b.endDate) === year));
  const prevYear = year - 1;
  const prevAll = done.filter((b) => isoYear(b.endDate) === prevYear);
  if (prevAll.length === 0) return { ...stats, vs: null };

  const prev = summarize(prevAll);
  const ratingDiff = diff(stats.avgRating, prev.avgRating);
  return {
    ...stats,
    vs: {
      books: stats.books - prev.books,
      pages: stats.pages - prev.pages,
      avgPages: diff(stats.avgPages, prev.avgPages),
      avgRating: ratingDiff == null ? null : round1(ratingDiff),
    },
  };
}

/** A tile's change: "+3", "−900", "+0.1", "same"; null when there's nothing to compare. */
export function formatDelta(n: number | null, decimals = 0): string | null {
  if (n == null) return null;
  if (n === 0) return 'same';
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${n > 0 ? '+' : '−'}${abs}`;
}
