import type { NetWorthEntry } from '../types';
import { getMonthlyChartData, getYearMetrics, getYears, getYearStats } from './metrics';

const entry = (date: string, netWorth: number): NetWorthEntry => ({ date, netWorth, source: 'account-based', accounts: [] });

// These functions read the clock to exclude the in-progress month, so pin it.
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 15)); // 15 Nov 2026
});
afterEach(() => jest.useRealTimers());

const history = [
  entry('2024-12-01', 1000),
  entry('2025-01-01', 1100), // +100 (+10%)
  entry('2025-02-01', 1000), // -100 (-9.09%)
  entry('2025-03-01', 1300), // +300 (+30%)
  entry('2026-10-01', 2000),
  entry('2026-11-01', 2500), // current month: excluded from calculations
];

describe('getYears', () => {
  it('lists each year once, oldest first', () => {
    expect(getYears(history)).toEqual([2024, 2025, 2026]);
  });

  it('returns nothing for empty or missing history', () => {
    expect(getYears([])).toEqual([]);
    expect(getYears(undefined)).toEqual([]);
  });
});

describe('getMonthlyChartData', () => {
  it('plots months in date order even when the history is not', () => {
    const shuffled = [entry('2025-03-01', 1300), entry('2025-01-01', 1100), entry('2025-02-01', 1000)];

    expect(getMonthlyChartData(shuffled, 2025).map((p) => p.month)).toEqual(['January', 'February', 'March']);
  });

  it('excludes the in-progress current month', () => {
    expect(getMonthlyChartData(history, 2026)).toEqual([{ month: 'October', netWorth: 2000 }]);
  });
});

describe('getYearMetrics', () => {
  it('compares the year’s last complete month with the previous year’s last entry', () => {
    expect(getYearMetrics(history, 2025)).toEqual({
      currentNetWorth: 1300,
      prevYearNetWorth: 1000,
      yoyChange: 300,
      yoyPercentage: 30,
    });
  });

  it('finds the previous year’s last entry even when the history is not in date order', () => {
    const shuffled = [entry('2024-12-01', 1000), entry('2025-03-01', 1300), entry('2024-06-01', 400)];

    expect(getYearMetrics(shuffled, 2025).prevYearNetWorth).toBe(1000); // December, not June
  });

  it('returns zeros when there is nothing to compare', () => {
    expect(getYearMetrics(undefined, 2025)).toEqual({
      currentNetWorth: 0,
      prevYearNetWorth: 0,
      yoyChange: 0,
      yoyPercentage: 0,
    });
  });
});

describe('getYearStats', () => {
  it('finds the best and worst months and averages over the months so far', () => {
    const stats = getYearStats(history, 2025);

    expect(stats.bestMonth).toMatchObject({ month: 'March', change: 300 });
    expect(stats.worstMonth).toMatchObject({ month: 'February', change: -100 });
    expect(stats.avgChange).toBeCloseTo(100); // (100 - 100 + 300) / 3: an incomplete year divides by 3
    expect(stats.highest).toBe(1300);
    expect(stats.lowest).toBe(1000);
  });

  it('returns empty stats for a year without data', () => {
    expect(getYearStats(history, 2023)).toMatchObject({ bestMonth: null, worstMonth: null, avgChange: 0 });
  });
});
