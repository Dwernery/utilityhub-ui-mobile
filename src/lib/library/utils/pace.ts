// Reading pace (Currently Reading) and yearly goal progress (Metrics).
// Mirrors utility-hub-ui's domains/library/utils/pace.js.
import { daysBetween, isoYear, parseLocalDate, toIsoDate, todayIso } from '@/lib/dates';
import type { Book } from '../types';

const addDays = (iso: string, n: number) => {
  const d = parseLocalDate(iso)!;
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

/** "Dec 3", or "Jan 4, 2027" when it's not this year. */
export const shortDate = (iso: string, today = todayIso()) =>
  parseLocalDate(iso)!.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isoYear(iso) !== isoYear(today) && { year: 'numeric' }),
  });

export interface ReadingPace {
  pagesPerDay: number;
  /** The day you'd finish at this rate; null once every page is read. */
  finishIso: string | null;
}

/**
 * Average pages a day since starting (the start day counts as a day) and the day you'd finish at
 * that rate. null until there's something to go on: a start date, a page count and some pages read.
 */
export function readingPace(
  book: Pick<Book, 'pages' | 'currentPage' | 'startDate'>,
  today = todayIso(),
): ReadingPace | null {
  const read = book.currentPage ?? 0;
  const pages = book.pages ?? 0;
  if (!book.startDate || read <= 0 || pages <= 0) return null;
  const days = Math.max(1, daysBetween(book.startDate, today) + 1);
  const perDay = read / days;
  const left = pages - read;
  return { pagesPerDay: perDay, finishIso: left > 0 ? addDays(today, Math.ceil(left / perDay)) : null };
}

/** "32 pages/day · Dec 3" (or null with no pace yet). */
export function paceLabel(book: Pick<Book, 'pages' | 'currentPage' | 'startDate'>, today = todayIso()): string | null {
  const pace = readingPace(book, today);
  if (!pace) return null;
  const rate = pace.pagesPerDay < 1 ? '<1 page/day' : `${Math.round(pace.pagesPerDay)} pages/day`;
  return pace.finishIso ? `${rate} · ${shortDate(pace.finishIso, today)}` : rate;
}

export interface GoalProgress {
  done: number;
  target: number;
  pct: number;
  status: 'met' | 'ahead' | 'onPace' | 'behind' | 'missed';
  delta: number;
  label: string;
}

/**
 * Progress toward finishing `target` books in `year`. During the year, "on pace" compares `done`
 * with the share of the target due by today (rounded down).
 */
export function goalProgress(done: number, target: number, year: number, today = todayIso()): GoalProgress {
  const pct = Math.min(100, Math.round((done / target) * 100));
  const base = { done, target, pct };
  if (done >= target) return { ...base, status: 'met', delta: done - target, label: 'Goal met' };
  if (year < isoYear(today)) return { ...base, status: 'missed', delta: done - target, label: `${target - done} short` };
  const start = `${year}-01-01`;
  const daysInYear = daysBetween(start, `${year + 1}-01-01`);
  const elapsed = year > isoYear(today) ? 0 : daysBetween(start, today) + 1;
  const due = Math.floor((target * elapsed) / daysInYear);
  const delta = done - due;
  if (delta > 0) return { ...base, status: 'ahead', delta, label: `${delta} ahead of pace` };
  if (delta === 0) return { ...base, status: 'onPace', delta, label: 'On pace' };
  return { ...base, status: 'behind', delta, label: `${-delta} behind pace` };
}
