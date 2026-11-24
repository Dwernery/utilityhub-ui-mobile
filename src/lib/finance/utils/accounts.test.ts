import type { Account } from '../types';
import { addableAccounts, assetTypeOptions, groupAccounts } from './accounts';
import { ASSET_TYPES } from './monthly';

const acct = (id: number, accountName: string, accountType: string, category: Account['category'], archived = false): Account => ({
  id,
  accountName,
  accountType,
  category,
  archived,
});

const accounts = [
  acct(1, 'Roth IRA', 'Retirement', 'ASSET'),
  acct(2, 'Checking', 'Cash & Savings', 'ASSET'),
  acct(3, 'Mortgage', 'Mortgage', 'LIABILITY'),
  acct(4, 'Old Savings', 'Cash & Savings', 'ASSET', true),
  acct(5, 'Car Loan', 'Auto Loan', 'LIABILITY', true),
  acct(6, 'Ally', 'Cash & Savings', 'ASSET'),
];

describe('groupAccounts', () => {
  it('splits active accounts by category and collects archived ones', () => {
    const { assets, liabilities, archived } = groupAccounts(accounts);
    expect(assets.map((a) => a.accountName)).toEqual(['Ally', 'Checking', 'Roth IRA']);
    expect(liabilities.map((a) => a.accountName)).toEqual(['Mortgage']);
    expect(archived.map((a) => a.accountName)).toEqual(['Car Loan', 'Old Savings']);
  });

  it('handles no accounts', () => {
    expect(groupAccounts()).toEqual({ assets: [], liabilities: [], archived: [] });
  });
});

describe('addableAccounts', () => {
  it('leaves out archived accounts and ones already in the month', () => {
    expect(addableAccounts(accounts, 'ASSET', new Set([2])).map((a) => a.id)).toEqual([1, 6]);
  });
});

describe('assetTypeOptions', () => {
  it('is the standard list for a standard type', () => {
    expect(assetTypeOptions('Investments')).toEqual([...ASSET_TYPES]);
  });

  it('keeps a custom current type selectable', () => {
    expect(assetTypeOptions('Crypto')).toEqual([...ASSET_TYPES, 'Crypto']);
  });
});
