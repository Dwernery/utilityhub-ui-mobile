import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { ACCOUNTS_KEY, INCOME_SOURCES_KEY, NET_WORTH_HISTORY_KEY, TRANSACTIONS_KEY } from './queryKeys';
import type { AccountCategory } from './types';

export function useNetWorthHistory() {
  return useQuery({ queryKey: NET_WORTH_HISTORY_KEY, queryFn: api.getNetWorthHistory });
}

export function useTransactions() {
  return useQuery({ queryKey: TRANSACTIONS_KEY, queryFn: api.getTransactions });
}

export function useIncomeSources() {
  return useQuery({ queryKey: INCOME_SOURCES_KEY, queryFn: api.getIncomeSources });
}

export function useAccounts() {
  return useQuery({ queryKey: ACCOUNTS_KEY, queryFn: api.getAccounts });
}

// ── Mutations (each refetches what it changes, like the web's invalidateQueries) ──

function useInvalidating<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, keys: (readonly string[])[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export const useSetAccountBalance = () =>
  useInvalidating(
    ({ accountId, date, balance }: { accountId: string; date: string; balance: number }) =>
      api.updateAccountBalance(accountId, date, balance),
    [NET_WORTH_HISTORY_KEY],
  );

export const useRemoveAccountBalance = () =>
  useInvalidating(
    ({ accountId, date }: { accountId: string; date: string }) => api.deleteAccountBalance(accountId, date),
    [NET_WORTH_HISTORY_KEY],
  );

export const useCreateAccount = () =>
  useInvalidating(
    ({ name, type, category }: { name: string; type: string; category: AccountCategory }) =>
      api.createAccount(name, type, category),
    [ACCOUNTS_KEY],
  );

export const useUpdateTransaction = () =>
  useInvalidating(
    ({ id, name, amount, paid }: { id: string; name: string; amount: number; paid: boolean }) =>
      api.updateTransaction(id, name, amount, paid),
    [TRANSACTIONS_KEY],
  );

export const useClearAllPaid = () => useInvalidating(() => api.clearAllPaid(), [TRANSACTIONS_KEY]);

export const useSaveIncomeSource = () =>
  useInvalidating(
    async ({ id, year, name, amount }: { id?: string; year: number; name: string; amount: number }): Promise<void> => {
      if (id) await api.updateIncomeSource(id, name, amount);
      else await api.createIncomeSource(year, name, amount);
    },
    [INCOME_SOURCES_KEY],
  );

export const useDeleteIncomeSource = () =>
  useInvalidating((id: string) => api.deleteIncomeSource(id), [INCOME_SOURCES_KEY]);
