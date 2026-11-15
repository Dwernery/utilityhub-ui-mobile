import { byDate, daysBetween, formatDate, isoMonth, isoYear, parseLocalDate, previousMonthIso, todayIso, toIsoDate } from './dates';

describe('parseLocalDate', () => {
  it('reads YYYY-MM-DD as a local calendar date, not UTC midnight', () => {
    const d = parseLocalDate('2024-01-01')!;

    // new Date('2024-01-01') would be 31 Dec 2023 in New York, where tests run.
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2024, 0, 1]);
  });

  it('returns null for missing or unparseable input', () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate('not a date')).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats a date, and shows a dash when there is none', () => {
    expect(formatDate('2024-01-05')).toBe('Jan 5, 2024');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('toIsoDate', () => {
  it('formats a local Date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('todayIso', () => {
  afterEach(() => jest.useRealTimers());

  // This was a test.failing in M1: todayIso used UTC, so in the evening it returned tomorrow.
  it('returns the local date, even late in the evening', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 14, 23, 59)); // 11:59pm, 14 Nov 2026, local time

    expect(todayIso()).toBe('2026-11-14');
  });
});

describe('isoYear / isoMonth', () => {
  it('read the parts straight from the string', () => {
    expect(isoYear('2025-01-01')).toBe(2025);
    expect(isoMonth('2025-01-01')).toBe(1);
    expect(isoMonth('2025-12-31')).toBe(12);
  });
});

describe('previousMonthIso', () => {
  it.each([
    ['2026-03-01', '2026-02-01'],
    ['2026-01-01', '2025-12-01'], // across a year boundary
    ['2026-10-15', '2026-09-01'], // any day of the month maps to the 1st of the previous one
  ])('%s → %s', (input, expected) => {
    expect(previousMonthIso(input)).toBe(expected);
  });
});

describe('daysBetween', () => {
  it.each([
    ['2026-03-01', '2026-03-04', 3],
    ['2026-03-07', '2026-03-09', 2], // spans the spring-forward night (a 23-hour day)
    ['2026-10-31', '2026-11-02', 2], // spans the fall-back night (a 25-hour day): ceil(49h) gave 3
    ['2025-12-30', '2026-01-02', 3], // across a year boundary
    ['2026-05-05', '2026-05-05', 0],
  ])('%s → %s is %d days', (start, end, days) => {
    expect(daysBetween(start, end)).toBe(days);
  });
});

describe('byDate', () => {
  it('sorts YYYY-MM-DD dates oldest first', () => {
    const sorted = [{ date: '2025-12-01' }, { date: '2024-06-01' }, { date: '2025-01-01' }].sort(byDate);

    expect(sorted.map((e) => e.date)).toEqual(['2024-06-01', '2025-01-01', '2025-12-01']);
  });
});
