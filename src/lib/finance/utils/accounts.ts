import type { Account, AccountCategory } from '../types';
import { ASSET_TYPES } from './monthly';

// Account management helpers. Mirrors the web's domains/finance/utils/accounts.js.

const byTypeThenName = (a: Account, b: Account) =>
  (a.accountType || '').localeCompare(b.accountType || '') || (a.accountName || '').localeCompare(b.accountName || '');

/** Active assets, active liabilities, then every archived account; each sorted by type, then name. */
export function groupAccounts(accounts: Account[] = []) {
  const active = accounts.filter((a) => !a.archived);
  return {
    assets: active.filter((a) => a.category === 'ASSET').sort(byTypeThenName),
    liabilities: active.filter((a) => a.category === 'LIABILITY').sort(byTypeThenName),
    archived: accounts.filter((a) => a.archived).sort(byTypeThenName),
  };
}

/** Accounts that can be added to a month: this category, not archived, not already in the month. */
export function addableAccounts(accounts: Account[] = [], category: AccountCategory, presentIds: Set<number>) {
  return accounts.filter((a) => a.category === category && !a.archived && !presentIds.has(a.id));
}

/** Asset type choices: the standard list, plus a custom current type so saving doesn't quietly change it. */
export function assetTypeOptions(currentType?: string): string[] {
  return currentType && !(ASSET_TYPES as readonly string[]).includes(currentType)
    ? [...ASSET_TYPES, currentType]
    : [...ASSET_TYPES];
}
