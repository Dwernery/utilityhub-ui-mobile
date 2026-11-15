import { parseMoney } from './currency';

describe('parseMoney', () => {
  it.each([
    ['1234.56', 1234.56],
    ['1,234.56', 1234.56], // thousands separators
    ['1,234,567', 1234567],
    ['$1,200', 1200], // a leading dollar sign
    ['  42 ', 42], // surrounding spaces
    ['.5', 0.5],
    ['5.', 5], // a trailing decimal point, easy to leave on the decimal pad
    ['0', 0],
    ['12,50', 12.5], // comma as the decimal point (regions where the keypad shows ",")
    ['7,5', 7.5],
  ])('accepts %j as %d', (input, expected) => {
    expect(parseMoney(input)).toEqual({ ok: true, value: expected });
  });

  // Every one of these used to be saved silently by parseFloat, as the number in brackets.
  it.each([
    ['45O0', '[45] a letter O instead of a zero'],
    ['12abc', '[12] trailing junk'],
    ['1,23,4', '[1] badly grouped commas'],
    ['1.234,56', '[1.234] European style thousands'],
    ['1e3', '[1000] scientific notation'],
    ['12..5', '[12] a double decimal point'],
  ])('rejects %j (%s)', (input) => {
    expect(parseMoney(input)).toEqual({ ok: false, error: 'Enter an amount like 1,234.56' });
  });

  it('rejects more than two decimal places instead of rounding silently', () => {
    expect(parseMoney('10.999')).toEqual({ ok: false, error: 'Use at most 2 decimal places' });
  });

  it('asks for an amount when the field is empty', () => {
    expect(parseMoney('')).toEqual({ ok: false, error: 'Enter an amount' });
    expect(parseMoney('   ')).toEqual({ ok: false, error: 'Enter an amount' });
    expect(parseMoney(undefined)).toEqual({ ok: false, error: 'Enter an amount' });
  });

  describe('negative amounts', () => {
    it('are rejected by default (transactions and income must be 0 or more)', () => {
      expect(parseMoney('-50')).toEqual({ ok: false, error: "Amount can't be negative" });
    });

    it('are accepted for balances, with the sign before or after the dollar sign', () => {
      expect(parseMoney('-50', { allowNegative: true })).toEqual({ ok: true, value: -50 });
      expect(parseMoney('-$1,200.50', { allowNegative: true })).toEqual({ ok: true, value: -1200.5 });
      expect(parseMoney('$-75', { allowNegative: true })).toEqual({ ok: true, value: -75 });
    });
  });
});
