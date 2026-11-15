export type AccountCategory = 'ASSET' | 'LIABILITY';

// These types mirror the API's response DTOs (see /v3/api-docs on the backend).
// IDs are numbers in JSON; values from route params arrive as strings and are
// converted once, at the screen boundary (see lib/routeParams.ts).

export interface Account {
  id: number;
  accountName: string;
  accountType: string;
  category: AccountCategory;
}

/** One account's balance inside a net-worth snapshot. */
export interface AccountBalance {
  accountId: number;
  accountName: string;
  accountType: string;
  category: AccountCategory;
  balance: number;
}

/**
 * A point on the net-worth chart. "historical" entries are recorded totals from
 * before per-account tracking began, so they have no account breakdown.
 */
export type NetWorthEntry = {
  /** `YYYY-MM-DD` */
  date: string;
  netWorth: number;
} & (
  | { source: 'historical'; accounts: null }
  | { source: 'account-based'; accounts: AccountBalance[] }
);

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: number;
  name: string;
  amount: number;
  paid: boolean;
  cash: boolean;
  transactionType: TransactionType;
}

export interface IncomeSource {
  id: number;
  year: number;
  name: string;
  amount: number;
}

export interface MonthChange {
  month: string;
  change: number;
  changePercent: number;
}
