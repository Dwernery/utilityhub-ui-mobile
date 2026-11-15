export const Currencyformatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export type ParseMoneyResult = { ok: true; value: number } | { ok: false; error: string };

// "1234.56", "1,234.56", ".5", "5." — US style, commas only in groups of three.
const US_FORMAT = /^(\d{1,3}(,\d{3})+|\d+)?(\.\d*)?$/;
// "12,50" — a comma as the decimal point (what the iOS decimal pad shows in many regions).
// One or two digits after the comma can't be a thousands group, so this is unambiguous.
const DECIMAL_COMMA_FORMAT = /^\d+,\d{1,2}$/;

/**
 * Strictly parse a money amount typed by the user.
 *
 * Unlike parseFloat, which reads "1,234.56" as 1 and "45O0" as 45, this either
 * understands the whole input or rejects it with a message to show the user.
 * The rules match the API: at most 2 decimal places; negative only where allowed.
 */
export function parseMoney(
  input: string | null | undefined,
  { allowNegative = false }: { allowNegative?: boolean } = {},
): ParseMoneyResult {
  let text = (input ?? '').trim();
  if (!text) return { ok: false, error: 'Enter an amount' };

  // Accept "-$5", "$-5" and "-5" alike.
  let negative = false;
  text = text.replace(/^-?\$?/, (prefix) => {
    negative = prefix.startsWith('-');
    return '';
  });
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  }
  text = text.trim();

  let normalized: string;
  if (DECIMAL_COMMA_FORMAT.test(text)) {
    normalized = text.replace(',', '.');
  } else if (US_FORMAT.test(text) && /\d/.test(text)) {
    normalized = text.replace(/,/g, '');
  } else {
    return { ok: false, error: 'Enter an amount like 1,234.56' };
  }

  const decimals = normalized.split('.')[1] ?? '';
  if (decimals.length > 2) return { ok: false, error: 'Use at most 2 decimal places' };

  if (negative && !allowNegative) return { ok: false, error: "Amount can't be negative" };

  const value = Number(normalized);
  return { ok: true, value: negative ? -value : value };
}
