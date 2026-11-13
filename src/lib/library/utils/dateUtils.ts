/** Parse `YYYY-MM-DD` as a local date (avoids the UTC off-by-one of `new Date('2024-01-01')`). */
export const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const dt = new Date(dateStr);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

export const formatDate = (dateStr: string | null | undefined): string => {
  const dt = parseLocalDate(dateStr);
  if (!dt) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Today's date as `YYYY-MM-DD`, matching the web client (UTC-based `toISOString`). */
export const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** `Date` → local `YYYY-MM-DD` (for values coming back from the native date picker). */
export const toIsoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Today as local `YYYY-MM-DD` (form defaults; `todayIso` keeps the web's UTC behavior for start-reading). */
export const todayLocalIso = (): string => toIsoDate(new Date());
