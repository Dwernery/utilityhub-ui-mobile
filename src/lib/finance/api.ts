import { requestJson, requestMaybeJson } from '../http';
import type { Account, AccountCategory, IncomeSource, NetWorthEntry, Transaction } from './types';

const BASE = '/api/finance';

export function getNetWorthHistory() {
  return requestJson<NetWorthEntry[]>(`${BASE}/net-worth-history`, {
    errorMessage: 'Failed to fetch net worth history',
  });
}

export function updateAccountBalance(accountId: number, balanceDate: string, balance: number) {
  return requestMaybeJson(`${BASE}/accounts/${accountId}/balances/${balanceDate}`, {
    method: 'PUT',
    body: { balance },
    errorMessage: 'Failed to update account balance',
    includeErrorDetail: true,
  });
}

export function deleteAccountBalance(accountId: number, balanceDate: string) {
  return requestMaybeJson(`${BASE}/accounts/${accountId}/balances/${balanceDate}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete account balance',
    includeErrorDetail: true,
  });
}

export function getAccounts() {
  return requestJson<Account[]>(`${BASE}/accounts`, { errorMessage: 'Failed to fetch accounts' });
}

export interface NewAccount {
  accountName: string;
  accountType: string;
  category: AccountCategory;
  /** Balance and date travel together: the API rejects one without the other. */
  initialBalance?: { balance: number; date: string };
}

/**
 * Creates the account and, optionally, its first monthly balance in ONE request.
 * The API does both in a single transaction, so either both exist or neither does.
 */
export function createAccount({ accountName, accountType, category, initialBalance }: NewAccount) {
  return requestJson<Account>(`${BASE}/accounts`, {
    method: 'POST',
    body: {
      accountName,
      accountType,
      category,
      ...(initialBalance && { balance: initialBalance.balance, balanceDate: initialBalance.date }),
    },
    errorMessage: 'Failed to create account',
    includeErrorDetail: true,
  });
}

export function getTransactions() {
  return requestJson<Transaction[]>(`${BASE}/transactions`, { errorMessage: 'Failed to fetch transactions' });
}

export function updateTransaction(id: number, name: string, amount: number, paid: boolean) {
  return requestMaybeJson(`${BASE}/transactions/${id}`, {
    method: 'PUT',
    body: { name, amount, paid },
    errorMessage: 'Failed to update transaction',
    includeErrorDetail: true,
  });
}

export function clearAllPaid() {
  return requestMaybeJson(`${BASE}/transactions/clear-paid`, {
    method: 'PUT',
    errorMessage: 'Failed to clear paid status',
    includeErrorDetail: true,
  });
}

export function getIncomeSources() {
  return requestJson<IncomeSource[]>(`${BASE}/income-sources`, { errorMessage: 'Failed to fetch income sources' });
}

export function createIncomeSource(year: number, name: string, amount: number) {
  return requestJson<IncomeSource>(`${BASE}/income-sources`, {
    method: 'POST',
    body: { year, name, amount },
    errorMessage: 'Failed to create income source',
    includeErrorDetail: true,
  });
}

export function updateIncomeSource(id: number, name: string, amount: number) {
  return requestMaybeJson(`${BASE}/income-sources/${id}`, {
    method: 'PUT',
    body: { name, amount },
    errorMessage: 'Failed to update income source',
    includeErrorDetail: true,
  });
}

export function deleteIncomeSource(id: number) {
  return requestMaybeJson(`${BASE}/income-sources/${id}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete income source',
    includeErrorDetail: true,
  });
}
