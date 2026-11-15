/**
 * Route params always arrive as strings (or arrays, for repeated params).
 * Convert an id param to a number once, at the screen boundary, so the rest of
 * the code can compare ids directly. Returns undefined for anything that isn't
 * a positive integer (e.g. "new", "abc", "", a missing param).
 */
export function parseIdParam(value: string | string[] | undefined): number | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  if (!text || !/^\d+$/.test(text)) return undefined;
  const id = Number(text);
  return id > 0 && Number.isSafeInteger(id) ? id : undefined;
}

/**
 * A `YYYY-MM` month key from a route param ("2026-11"), or undefined if it isn't one
 * (wrong format, month outside 1–12).
 */
export function parseMonthKey(value: string | string[] | undefined): { year: number; month: number } | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const match = text?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : undefined;
}
