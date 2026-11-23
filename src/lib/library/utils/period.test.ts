import type { Book } from '../types';
import { formatDelta, periodStats, periodYears } from './period';

// Mirrors utility-hub-ui's domains/library/utils/period.test.js.
const read = (endDate: string, pages: number, rating: number | null = null) =>
  ({ status: 'READ', endDate, pages, rating }) as Book;
const books = [
  read('2024-06-01', 300, 4),
  read('2025-03-10', 200, 5),
  read('2025-11-01', 400, 3),
  read('2025-12-20', 500),
  read('2026-02-01', 300, 4),
  read('2026-10-01', 500),
  { status: 'IN_PROGRESS', endDate: null, pages: 999 } as Book,
];
const TODAY = '2026-11-22';

describe('periodYears', () => {
  it('lists years with finished books, newest first, plus this year', () => {
    expect(periodYears(books, TODAY)).toEqual([2026, 2025, 2024]);
    expect(periodYears([], TODAY)).toEqual([2026]);
  });
});

describe('periodStats', () => {
  it('sums all time, with no comparison', () => {
    expect(periodStats(books, null)).toEqual({
      books: 6,
      pages: 2200,
      avgPages: 367,
      avgRating: 4,
      vs: null,
    });
  });

  it('compares this year so far with the whole year before', () => {
    // All of 2025: 3 books, 1,100 pages, avg 367, rating 4.0.
    const s = periodStats(books, 2026);
    expect(s).toMatchObject({ books: 2, pages: 800, avgPages: 400, avgRating: 4 });
    expect(s.vs).toEqual({ books: -1, pages: -300, avgPages: 33, avgRating: 0 });
  });

  it('compares a past year with the whole year before', () => {
    const s = periodStats(books, 2025);
    expect(s).toMatchObject({ books: 3, pages: 1100, avgPages: 367, avgRating: 4 });
    expect(s.vs).toEqual({ books: 2, pages: 800, avgPages: 67, avgRating: 0 });
  });

  it('has no comparison when the year before has no finished books', () => {
    expect(periodStats(books, 2024)).toMatchObject({ books: 1, vs: null });
  });

  it('leaves averages empty for a year with nothing finished', () => {
    const s = periodStats([read('2025-01-01', 100)], 2026);
    expect(s).toMatchObject({ books: 0, avgPages: null, avgRating: null });
    expect(s.vs).toMatchObject({ books: -1, pages: -100, avgPages: null });
  });
});

describe('formatDelta', () => {
  it("signs changes and says 'same' for none", () => {
    expect(formatDelta(3)).toBe('+3');
    expect(formatDelta(-1200)).toBe('−1,200');
    expect(formatDelta(0.1, 1)).toBe('+0.1');
    expect(formatDelta(0)).toBe('same');
    expect(formatDelta(null)).toBeNull();
  });
});
