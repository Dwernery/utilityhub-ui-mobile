export type AccountCategory = 'ASSET' | 'LIABILITY';

export interface Account {
  id: string;
  accountName: string;
  accountType: string;
  category: AccountCategory;
}

/** One account's balance inside a net-worth snapshot. */
export interface AccountBalance {
  id?: string;
  accountId: string;
  accountName: string;
  accountType: string;
  category: AccountCategory;
  balance: number;
  change?: number | null;
  percentChange?: number | null;
}

/** A monthly net-worth snapshot. */
export interface NetWorthEntry {
  /** `YYYY-MM-DD` */
  date: string;
  netWorth: number;
  accounts: AccountBalance[];
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  cash?: boolean;
  transactionType: TransactionType;
}

export interface IncomeSource {
  id: string;
  year: number;
  name: string;
  amount: number;
}

export interface MonthChange {
  month: string;
  change: number;
  changePercent: number;
}
