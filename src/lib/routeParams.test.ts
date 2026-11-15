import { parseIdParam, parseMonthKey } from './routeParams';

describe('parseIdParam', () => {
  it('converts a numeric param', () => {
    expect(parseIdParam('42')).toBe(42);
    expect(parseIdParam(['7', '8'])).toBe(7);
  });

  it.each([['new'], ['abc'], [''], ['0'], ['-3'], ['1.5'], ['4e2'], ['99999999999999999999'], [undefined]])(
    'rejects %j',
    (value) => {
      expect(parseIdParam(value)).toBeUndefined();
    },
  );
});

describe('parseMonthKey', () => {
  it('reads a YYYY-MM key', () => {
    expect(parseMonthKey('2026-11')).toEqual({ year: 2026, month: 11 });
    expect(parseMonthKey('2026-01')).toEqual({ year: 2026, month: 1 });
  });

  it.each([['2026-13'], ['2026-00'], ['2026-1'], ['garbage'], ['2026-11-01'], [''], [undefined]])('rejects %j', (value) => {
    expect(parseMonthKey(value)).toBeUndefined();
  });
});
