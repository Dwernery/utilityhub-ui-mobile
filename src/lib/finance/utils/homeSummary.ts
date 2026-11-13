import type { AccountBalance, NetWorthEntry, Transaction } from '../types';

const yearOf = (e: NetWorthEntry) => parseInt((e?.date || '').split('-')[0]);
const monthOf = (e: NetWorthEntry) => parseInt((e?.date || '').split('-')[1]);
const byDate = (a: NetWorthEntry, b: NetWorthEntry) => new Date(a.date).getTime() - new Date(b.date).getTime();

export interface AccountChange extends AccountBalance {
  change: number | null;
  percentChange: number | null;
}

export interface FinanceHomeSummary {
  /** Latest *complete* month this year. */
  netWorth: number;
  /** vs. previous year's December snapshot */
  dollarChange: number;
  percentChange: number;
  /** Latest snapshot + unpaid income − unpaid expenses */
  projectedNetWorth: number;
  projectedPercentChange: number;
  /** Non-liability accounts in the latest snapshot vs. the calendar month before it */
  accountChanges: AccountChange[];
}

/** Ported 1:1 from the web FinancesHomeCard so the numbers match. */
export function financeHomeSummary(
  history: NetWorthEntry[] | undefined,
  transactions: Transaction[] | undefined,
  now = new Date(),
): FinanceHomeSummary {
  const all = history ?? [];
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const entriesForYear = all.filter((e) => yearOf(e) === currentYear).sort(byDate);
  const fullMonths = entriesForYear.filter((e) => monthOf(e) !== currentMonth);
  const latestFullMonthEntry = fullMonths.at(-1) ?? null;
  const latestEntry = entriesForYear.at(-1) ?? null;

  // Account changes vs. the calendar month directly before the latest snapshot
  let accountChanges: AccountChange[] = [];
  if (latestEntry?.accounts?.length) {
    const [y, m] = latestEntry.date.split('-');
    const prev = new Date(parseInt(y), parseInt(m) - 1, 1);
    prev.setMonth(prev.getMonth() - 1);
    const prevDate = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`;
    const prevEntry = all.find((e) => e.date === prevDate);

    accountChanges = latestEntry.accounts
      .filter((a) => a.category !== 'LIABILITY')
      .map((account) => {
        const key = account.id || account.accountId;
        const prevAccount = prevEntry?.accounts?.find(
          (a) => (a.id || a.accountId) === key || a.accountName === account.accountName,
        );
        if (!prevAccount) return { ...account, change: null, percentChange: null };
        const prevBalance = prevAccount.balance || 0;
        const change = (account.balance || 0) - prevBalance;
        return { ...account, change, percentChange: prevBalance !== 0 ? (change / prevBalance) * 100 : 0 };
      });
  }

  if (!latestFullMonthEntry) {
    return { netWorth: 0, dollarChange: 0, percentChange: 0, projectedNetWorth: 0, projectedPercentChange: 0, accountChanges };
  }

  const netWorth = latestFullMonthEntry.netWorth;
  const prevYearEnd = [...all].sort(byDate).find((e) => e.date === `${currentYear - 1}-12-01`);
  const prevYearEndNetWorth = prevYearEnd?.netWorth || netWorth;
  const dollarChange = netWorth - prevYearEndNetWorth;
  const percentChange = prevYearEndNetWorth !== 0 ? (dollarChange / prevYearEndNetWorth) * 100 : 0;

  let unpaidIncome = 0;
  let unpaidExpenses = 0;
  for (const t of transactions ?? []) {
    if (t.paid) continue;
    if (t.transactionType === 'INCOME') unpaidIncome += t.amount;
    else if (t.transactionType === 'EXPENSE') unpaidExpenses += t.amount;
  }
  const projectedNetWorth = (latestEntry?.netWorth || netWorth) + unpaidIncome - unpaidExpenses;
  const projectedPercentChange = netWorth !== 0 ? ((projectedNetWorth - netWorth) / netWorth) * 100 : 0;

  return { netWorth, dollarChange, percentChange, projectedNetWorth, projectedPercentChange, accountChanges };
}

/** Whole-dollar currency (the web's phone-width format). */
export const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const centsDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Dollar formatters: whole dollars for the cramped phone card (web parity), cents when there's room. */
export function dollarFormat(withCents: boolean) {
  const f = withCents ? centsDollars : wholeDollars;
  return {
    plain: (n: number) => f.format(n),
    /** `+$1,234` / `-$1,234` */
    signed: (n: number) => `${n >= 0 ? '+' : '-'}${f.format(Math.abs(n))}`,
  };
}

/** `+$1,234` / `-$1,234` */
export const signedDollars = dollarFormat(false).signed;
/** `+1.2%` / `-1.2%` */
export const signedPercent = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}%`;
