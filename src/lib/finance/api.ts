import { requestJson, requestMaybeJson } from '../http';
import type { Account, AccountCategory, IncomeSource, NetWorthEntry, Transaction } from './types';

const BASE = '/api/finance';

export function getNetWorthHistory() {
  return requestJson<NetWorthEntry[]>(`${BASE}/net-worth-history`, {
    errorMessage: 'Failed to fetch net worth history',
  });
}

export function updateAccountBalance(accountId: string, balanceDate: string, balance: number) {
  return requestMaybeJson(`${BASE}/account-balance`, {
    method: 'PUT',
    body: { accountId, balanceDate, balance },
    errorMessage: 'Failed to update account balance',
    includeErrorDetail: true,
  });
}

export function deleteAccountBalance(accountId: string, balanceDate: string) {
  return requestMaybeJson(`${BASE}/account-balance`, {
    method: 'DELETE',
    body: { accountId, balanceDate },
    errorMessage: 'Failed to delete account balance',
    includeErrorDetail: true,
  });
}

export function getAccounts() {
  return requestJson<Account[]>(`${BASE}/accounts`, { errorMessage: 'Failed to fetch accounts' });
}

export function createAccount(accountName: string, accountType: string, category: AccountCategory) {
  return requestJson<Account>(`${BASE}/accounts`, {
    method: 'POST',
    body: { accountName, accountType, category },
    errorMessage: 'Failed to create account',
    includeErrorDetail: true,
  });
}

export function getTransactions() {
  return requestJson<Transaction[]>(`${BASE}/transactions`, { errorMessage: 'Failed to fetch transactions' });
}

export function updateTransaction(id: string, name: string, amount: number, paid: boolean) {
  return requestMaybeJson(`${BASE}/transactions`, {
    method: 'PUT',
    body: { id, name, amount, paid },
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

export function updateIncomeSource(id: string, name: string, amount: number) {
  return requestMaybeJson(`${BASE}/income-sources`, {
    method: 'PUT',
    body: { id, name, amount },
    errorMessage: 'Failed to update income source',
    includeErrorDetail: true,
  });
}

export function deleteIncomeSource(id: string) {
  return requestMaybeJson(`${BASE}/income-sources`, {
    method: 'DELETE',
    body: { id },
    errorMessage: 'Failed to delete income source',
    includeErrorDetail: true,
  });
}
