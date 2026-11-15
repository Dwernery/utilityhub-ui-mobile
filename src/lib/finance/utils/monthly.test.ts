import type { AccountBalance, NetWorthEntry, Transaction } from '../types';
import { buildMonthlyRows, monthAccounts, transactionTotals } from './monthly';

// Small builders keep each test focused on the values that matter to it.
const entry = (date: string, netWorth: number, accounts: AccountBalance[] = []): NetWorthEntry => ({
  date,
  netWorth,
  source: 'account-based',
  accounts,
});
const account = (
  accountId: number,
  category: AccountBalance['category'],
  balance: number,
  accountType = 'Cash & Savings',
): AccountBalance => ({ accountId, accountName: `Account ${accountId}`, accountType, category, balance });

describe('buildMonthlyRows', () => {
  const now = new Date(2026, 10, 15); // 15 Nov 2026: November is the in-progress month

  const history = [
    entry('2025-12-01', 1000), // last year's ending balance
    entry('2026-01-01', 1100),
    entry('2026-02-01', 1210),
    entry('2026-11-01', 1500), // current month
  ];

  it('always returns 12 rows keyed YYYY-MM', () => {
    const rows = buildMonthlyRows(history, 2026, now);

    expect(rows).toHaveLength(12);
    expect(rows.map((r) => r.key)).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
  });

  it('compares January against the previous year’s last entry', () => {
    const [january] = buildMonthlyRows(history, 2026, now);

    expect(january.change).toBe(100); // 1100 - 1000
    expect(january.changePercent).toBeCloseTo(10);
  });

  it('compares later months against the previous complete month', () => {
    const february = buildMonthlyRows(history, 2026, now)[1];

    expect(february.change).toBe(110); // 1210 - 1100
    expect(february.changePercent).toBeCloseTo(10);
  });

  it('marks months without data and leaves their numbers empty', () => {
    const march = buildMonthlyRows(history, 2026, now)[2];

    expect(march).toMatchObject({ hasData: false, netWorth: null, change: null, date: null });
  });

  it('shows the current month as display-only, compared with the last complete month', () => {
    const november = buildMonthlyRows(history, 2026, now)[10];

    expect(november).toMatchObject({ isCurrentMonth: true, hasData: true, netWorth: 1500 });
    expect(november.change).toBe(290); // 1500 - 1210 (February is the last complete month)
  });

  it('offers an empty current month as a date the user can add balances to', () => {
    const november = buildMonthlyRows([entry('2026-01-01', 1)], 2026, now)[10];

    expect(november).toMatchObject({ isCurrentMonth: true, hasData: false, date: '2026-11-01', netWorth: 0 });
  });

  it('uses the hard-coded opening balance for 2022, when data collection started', () => {
    const [january] = buildMonthlyRows([entry('2022-01-01', 50000)], 2022, now);

    expect(january.change).toBeCloseTo(1826.95); // 50000 - 48173.05
  });

  it('handles a missing history', () => {
    expect(buildMonthlyRows(undefined, 2026, now).every((r) => !r.hasData || r.isCurrentMonth)).toBe(true);
  });
});

describe('monthAccounts', () => {
  const history = [
    entry('2025-12-01', 60, [account(1, 'ASSET', 100)]),
    entry('2026-01-01', 120, [
      account(1, 'ASSET', 150, 'Cash & Savings'),
      account(2, 'ASSET', 10, 'Investments'),
      account(3, 'LIABILITY', 40, 'Credit Card'),
    ]),
  ];

  it('splits accounts into assets and liabilities, sorted by account type', () => {
    const month = monthAccounts(history, '2026-01-01');

    expect(month.assets.map((a) => a.accountId)).toEqual([1, 2]);
    expect(month.liabilities.map((a) => a.accountId)).toEqual([3]);
    expect(month.hasData).toBe(true);
    expect(month.netWorth).toBe(120);
  });

  it('computes each account’s change versus the previous calendar month, across a year boundary', () => {
    const [checking, newAccount] = monthAccounts(history, '2026-01-01').assets;

    expect(checking.change).toBe(50); // 150 vs December's 100
    expect(checking.changePercent).toBeCloseTo(50);
    expect(newAccount.change).toBeNull(); // didn't exist last month
  });

  it('reports a month with no snapshot as empty', () => {
    const month = monthAccounts(history, '2026-05-01');

    expect(month).toMatchObject({ hasData: false, assets: [], liabilities: [], netWorth: 0 });
  });

  it('tolerates historical entries whose accounts are null (as the API sends them)', () => {
    const historical: NetWorthEntry = { date: '2026-01-01', netWorth: 99, source: 'historical', accounts: null };

    expect(monthAccounts([historical], '2026-01-01')).toMatchObject({ hasData: false, netWorth: 99 });
  });
});

describe('transactionTotals', () => {
  const tx = (transactionType: Transaction['transactionType'], amount: number, cash: boolean): Transaction => ({
    id: amount,
    name: 'x',
    amount,
    paid: false,
    cash,
    transactionType,
  });

  it('totals income and expenses, and counts only cash items in net cash flow', () => {
    const totals = transactionTotals([
      tx('INCOME', 3000, true),
      tx('INCOME', 500, false),
      tx('EXPENSE', 1200, true),
      tx('EXPENSE', 300, false),
    ]);

    expect(totals).toEqual({
      income: 3500,
      expenses: 1500,
      netIncome: 2000,
      netCashFlow: 1800, // 3000 - 1200
    });
  });
});
