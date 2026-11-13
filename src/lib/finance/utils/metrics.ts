import type { MonthChange, NetWorthEntry } from '../types';

type History = NetWorthEntry[] | null | undefined;

/** Previous-year ending net worth for years where data collection started mid-way. */
export const PRIOR_YEAR_ENDING_BALANCES: Record<number, number> = {
  2022: 48173.05, // Jan 2022 is the first month of data collection
};

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const entryYear = (entry: NetWorthEntry | undefined) => parseInt((entry?.date || '').split('-')[0]);
const entryMonth = (entry: NetWorthEntry | undefined) => parseInt((entry?.date || '').split('-')[1]);
const byDateAsc = (a: NetWorthEntry, b: NetWorthEntry) => new Date(a.date).getTime() - new Date(b.date).getTime();

/** Exclude the in-progress current month. */
const excludeCurrentMonth = (entries: NetWorthEntry[]) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  return entries.filter((entry) => !(entryYear(entry) === currentYear && entryMonth(entry) === currentMonth));
};

export const getYears = (netWorthHistory: History): number[] => {
  if (!netWorthHistory || netWorthHistory.length === 0) return [];
  return [...new Set(netWorthHistory.map(entryYear))].sort((a, b) => a - b);
};

export const getMonthlyChartData = (netWorthHistory: History, year: number) => {
  if (!netWorthHistory || netWorthHistory.length === 0) return [];
  return excludeCurrentMonth(netWorthHistory.filter((entry) => entryYear(entry) === year)).map((entry) => ({
    month: MONTH_LABELS[entryMonth(entry) - 1],
    netWorth: entry.netWorth,
  }));
};

const sumCategory = (entry: NetWorthEntry | undefined, category: 'ASSET' | 'LIABILITY') =>
  (entry?.accounts || []).reduce((sum, account) => (account.category === category ? sum + (account.balance || 0) : sum), 0);

export const getEntryAssets = (entry: NetWorthEntry | undefined) => sumCategory(entry, 'ASSET');
export const getEntryLiabilities = (entry: NetWorthEntry | undefined) => sumCategory(entry, 'LIABILITY');

export const getYearMetrics = (netWorthHistory: History, selectedYear: number | null | undefined) => {
  if (!netWorthHistory || !selectedYear) {
    return { currentNetWorth: 0, prevYearNetWorth: 0, yoyChange: 0, yoyPercentage: 0 };
  }

  // Last entry for the selected year, excluding current month
  const yearEntries = excludeCurrentMonth(netWorthHistory.filter((entry) => entryYear(entry) === selectedYear)).sort(
    byDateAsc,
  );
  const lastYearEntry = yearEntries[yearEntries.length - 1];

  // Last entry from previous year for YoY comparison
  const prevYearEntries = netWorthHistory.filter((entry) => entryYear(entry) === selectedYear - 1);
  const lastPrevYearEntry = prevYearEntries[prevYearEntries.length - 1];

  const currentNetWorth = lastYearEntry?.netWorth || 0;

  // Use hardcoded prior-year balance if available, otherwise API data
  let prevYearNetWorth = 0;
  if (PRIOR_YEAR_ENDING_BALANCES[selectedYear] !== undefined) {
    prevYearNetWorth = PRIOR_YEAR_ENDING_BALANCES[selectedYear];
  } else if (lastPrevYearEntry) {
    prevYearNetWorth = lastPrevYearEntry.netWorth || 0;
  }

  const yoyChange = currentNetWorth - prevYearNetWorth;
  const yoyPercentage = prevYearNetWorth !== 0 ? (yoyChange / prevYearNetWorth) * 100 : 0;

  return { currentNetWorth, prevYearNetWorth, yoyChange, yoyPercentage };
};

export interface YearStats {
  bestMonth: MonthChange | null;
  worstMonth: MonthChange | null;
  avgChange: number;
  avgChangePercent: number;
  highest: number;
  lowest: number;
}

export const getYearStats = (netWorthHistory: History, selectedYear: number | null | undefined): YearStats => {
  const empty: YearStats = { bestMonth: null, worstMonth: null, avgChange: 0, avgChangePercent: 0, highest: 0, lowest: 0 };
  if (!netWorthHistory || !selectedYear) return empty;

  const entries = excludeCurrentMonth(netWorthHistory.filter((entry) => entryYear(entry) === selectedYear)).sort(
    byDateAsc,
  );
  if (entries.length === 0) return empty;

  // Monthly changes; January compares against the prior year's ending balance
  const monthlyChanges: MonthChange[] = entries.map((entry, idx) => {
    const monthIndex = entryMonth(entry) - 1;
    let prevNetWorth = 0;

    if (idx > 0) {
      prevNetWorth = entries[idx - 1].netWorth || 0;
    } else if (monthIndex === 0) {
      if (PRIOR_YEAR_ENDING_BALANCES[selectedYear] !== undefined) {
        prevNetWorth = PRIOR_YEAR_ENDING_BALANCES[selectedYear];
      } else {
        const prevYearEntries = netWorthHistory
          .filter((e) => entryYear(e) === selectedYear - 1)
          .sort((a, b) => byDateAsc(b, a));
        if (prevYearEntries.length > 0) prevNetWorth = prevYearEntries[0].netWorth || 0;
      }
    }

    const change = (entry.netWorth || 0) - prevNetWorth;
    const changePercent = prevNetWorth !== 0 ? (change / prevNetWorth) * 100 : 0;
    return { month: MONTH_LABELS[monthIndex], change, changePercent };
  });

  const bestMonth = monthlyChanges.reduce((a, b) => (b.change > a.change ? b : a));
  const worstMonth = monthlyChanges.reduce((a, b) => (b.change < a.change ? b : a));

  // Complete past years divide by 12; in-progress years by the actual month count
  const isCompleteYear = selectedYear < new Date().getFullYear() && entries.length === 12;
  const avgDivisor = isCompleteYear ? 12 : monthlyChanges.length;

  const avgChange = monthlyChanges.reduce((sum, m) => sum + m.change, 0) / avgDivisor;
  const avgChangePercent = monthlyChanges.reduce((sum, m) => sum + m.changePercent, 0) / avgDivisor;

  const netWorths = entries.map((entry) => entry.netWorth || 0);

  return {
    bestMonth,
    worstMonth,
    avgChange,
    avgChangePercent,
    highest: Math.max(...netWorths),
    lowest: Math.min(...netWorths),
  };
};
