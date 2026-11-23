import { goalProgress, paceLabel, readingPace, shortDate } from './pace';

// Mirrors utility-hub-ui's domains/library/utils/pace.test.js.
const book = (over: Partial<{ pages: number; currentPage: number; startDate: string | null }> = {}) => ({
  pages: 400,
  currentPage: 100,
  startDate: '2026-11-13' as string | null,
  ...over,
});

describe('readingPace', () => {
  it('averages pages over the days since starting, counting the start day', () => {
    // Nov 13–22 is 10 days: 10 pages/day, 300 left → 30 more days.
    expect(readingPace(book(), '2026-11-22')).toEqual({ pagesPerDay: 10, finishIso: '2026-12-22' });
  });

  it('counts a book started today as one day', () => {
    expect(readingPace(book({ startDate: '2026-11-22' }), '2026-11-22')?.pagesPerDay).toBe(100);
  });

  it('has no finish date once every page is read, and no pace without progress', () => {
    expect(readingPace(book({ currentPage: 400 }), '2026-11-22')?.finishIso).toBeNull();
    expect(readingPace(book({ currentPage: 0 }), '2026-11-22')).toBeNull();
    expect(readingPace(book({ startDate: null }), '2026-11-22')).toBeNull();
  });
});

describe('paceLabel', () => {
  it("reads like '10 pages/day · Dec 22'", () => {
    expect(paceLabel(book(), '2026-11-22')).toBe('10 pages/day · Dec 22');
  });

  it('shows the year when the finish is next year', () => {
    // 10 pages/day, 700 left → 70 days after Nov 22.
    expect(paceLabel(book({ pages: 800 }), '2026-11-22')).toBe('10 pages/day · Jan 31, 2027');
  });

  it('says <1 page/day for slow going', () => {
    // 5 pages in 30 days.
    expect(paceLabel(book({ currentPage: 5, startDate: '2026-10-24' }), '2026-11-22')).toMatch(/^<1 page\/day · /);
  });
});

describe('shortDate', () => {
  it('leaves out this year', () => {
    expect(shortDate('2026-12-03', '2026-11-22')).toBe('Dec 3');
    expect(shortDate('2027-01-04', '2026-11-22')).toBe('Jan 4, 2027');
  });
});

describe('goalProgress', () => {
  // Jul 2 is day 183 of 365: half of 24 (rounded down) is due → 12.
  it('compares with the share of the target due by today', () => {
    expect(goalProgress(12, 24, 2026, '2026-07-02')).toMatchObject({ status: 'onPace', label: 'On pace', pct: 50 });
    expect(goalProgress(14, 24, 2026, '2026-07-02')).toMatchObject({ status: 'ahead', label: '2 ahead of pace' });
    expect(goalProgress(9, 24, 2026, '2026-07-02')).toMatchObject({ status: 'behind', label: '3 behind pace' });
  });

  it('is met once the target is reached, and short for a past year', () => {
    expect(goalProgress(26, 25, 2026, '2026-11-22')).toMatchObject({ status: 'met', label: 'Goal met', pct: 100 });
    expect(goalProgress(18, 20, 2025, '2026-11-22')).toMatchObject({ status: 'missed', label: '2 short' });
  });
});
