import type { AccountBalance, NetWorthEntry, Transaction } from '../types';
import { getEntryAssets, getEntryLiabilities, MONTH_LABELS, PRIOR_YEAR_ENDING_BALANCES } from './metrics';

const yearOf = (e: NetWorthEntry) => parseInt((e?.date || '').split('-')[0]);
const monthOf = (e: NetWorthEntry) => parseInt((e?.date || '').split('-')[1]);
const byDate = (a: NetWorthEntry, b: NetWorthEntry) => new Date(a.date).getTime() - new Date(b.date).getTime();

export interface MonthRow {
  /** `YYYY-MM` — route key for the month sheet */
  key: string;
  /** `YYYY-MM-01` when there's (or can be) data */
  date: string | null;
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number | null;
  change: number | null;
  changePercent: number | null;
  hasData: boolean;
  isCurrentMonth: boolean;
}

const pct = (change: number, prev: number) => (prev !== 0 ? (change / prev) * 100 : 0);

/** The 12 rows of the dashboard's monthly table (ported 1:1 from MonthlyTable's useMemo). */
export function buildMonthlyRows(history: NetWorthEntry[] | undefined, selectedYear: number, now = new Date()): MonthRow[] {
  const all = history ?? [];
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const keyFor = (m: number) => `${selectedYear}-${String(m + 1).padStart(2, '0')}`;

  // Complete months of the selected year (current month excluded from calculations)
  const entries = all
    .filter((e) => !(yearOf(e) === currentYear && monthOf(e) === currentMonth) && yearOf(e) === selectedYear)
    .sort(byDate);

  const rows = new Map<number, MonthRow>();
  entries.forEach((entry, idx) => {
    const assets = getEntryAssets(entry);
    const liabilities = getEntryLiabilities(entry);
    const netWorth = entry.netWorth || assets - liabilities;
    const monthIndex = monthOf(entry) - 1;

    let change = 0;
    let changePercent = 0;
    const prevEntry = entries[idx - 1];
    if (prevEntry) {
      const prev = prevEntry.netWorth || 0;
      change = netWorth - prev;
      changePercent = pct(change, prev);
    } else if (monthIndex === 0) {
      // January compares against last year's ending balance
      let prev: number | undefined = PRIOR_YEAR_ENDING_BALANCES[selectedYear];
      if (prev === undefined) {
        const prevYear = all.filter((e) => yearOf(e) === selectedYear - 1).sort((a, b) => byDate(b, a));
        prev = prevYear[0]?.netWorth;
      }
      if (prev !== undefined) {
        change = netWorth - (prev || 0);
        changePercent = pct(change, prev || 0);
      }
    }

    rows.set(monthIndex, {
      key: keyFor(monthIndex),
      date: entry.date,
      month: MONTH_LABELS[monthIndex],
      assets,
      liabilities,
      netWorth,
      change,
      changePercent,
      hasData: true,
      isCurrentMonth: false,
    });
  });

  // Current month: display only, change vs. the last complete month
  if (selectedYear === currentYear) {
    const current = all
      .filter((e) => yearOf(e) === currentYear && monthOf(e) === currentMonth)
      .sort((a, b) => byDate(b, a))[0];
    if (current) {
      const assets = getEntryAssets(current);
      const liabilities = getEntryLiabilities(current);
      const netWorth = current.netWorth || assets - liabilities;
      const last = entries.at(-1);
      const prev = last?.netWorth || 0;
      const change = last ? netWorth - prev : 0;
      rows.set(currentMonth - 1, {
        key: keyFor(currentMonth - 1),
        date: current.date,
        month: MONTH_LABELS[currentMonth - 1],
        assets,
        liabilities,
        netWorth,
        change,
        changePercent: last ? pct(change, prev) : 0,
        hasData: true,
        isCurrentMonth: true,
      });
    }
  }

  return MONTH_LABELS.map((month, i) => {
    const existing = rows.get(i);
    if (existing) return existing;
    const isCurrent = selectedYear === currentYear && i === currentMonth - 1;
    return {
      key: keyFor(i),
      date: isCurrent ? `${keyFor(i)}-01` : null,
      month,
      assets: 0,
      liabilities: 0,
      netWorth: isCurrent ? 0 : null,
      change: null,
      changePercent: null,
      hasData: false,
      isCurrentMonth: isCurrent,
    };
  });
}

/** Accounts in a month snapshot with change vs. the previous calendar month (ported from MonthlyDetailModal). */
export function monthAccounts(history: NetWorthEntry[] | undefined, date: string) {
  const all = history ?? [];
  const entry = all.find((e) => e.date === date);
  const [y, m] = date.split('-').map(Number);
  const prev = new Date(y, m - 1, 1);
  prev.setMonth(prev.getMonth() - 1);
  const prevDate = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
  const prevBalances = new Map(
    (all.find((e) => e.date === prevDate)?.accounts ?? []).map((a) => [String(a.id || a.accountId), a.balance]),
  );

  const withChange = (a: AccountBalance) => {
    const before = prevBalances.get(String(a.id || a.accountId));
    if (before === undefined) return { ...a, change: null as number | null, changePercent: null as number | null };
    const change = a.balance - before;
    return { ...a, change, changePercent: pct(change, before) };
  };

  const accounts = (entry?.accounts ?? []).map(withChange);
  const byType = (a: AccountBalance, b: AccountBalance) => (a.accountType || '').localeCompare(b.accountType || '');
  const assets = accounts.filter((a) => a.category === 'ASSET').sort(byType);
  const liabilities = accounts.filter((a) => a.category === 'LIABILITY').sort(byType);
  const totalAssets = assets.reduce((s, a) => s + (a.balance || 0), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + (a.balance || 0), 0);

  return {
    hasData: accounts.length > 0,
    assets,
    liabilities,
    netWorth: entry?.netWorth ?? totalAssets - totalLiabilities,
  };
}

/** Summary tiles for Income & Expenses (ported as-is, including the web's "cash only" net cash flow). */
export function transactionTotals(transactions: Transaction[]) {
  const sum = (list: Transaction[]) => list.reduce((s, t) => s + t.amount, 0);
  const income = sum(transactions.filter((t) => t.transactionType === 'INCOME'));
  const expenses = sum(transactions.filter((t) => t.transactionType === 'EXPENSE'));
  const netCashFlow =
    sum(transactions.filter((t) => t.transactionType === 'INCOME' && t.cash)) -
    sum(transactions.filter((t) => t.transactionType === 'EXPENSE' && t.cash));
  return { income, expenses, netCashFlow, netIncome: income - expenses };
}

/** Asset account types offered when creating an account (liabilities take free text, like the web). */
export const ASSET_TYPES = ['Cash & Savings', 'Investments', 'Retirement', 'Property'] as const;
