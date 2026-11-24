// Node types come in through jest; this test reads the JSON files directly (fs) to compare the two copies.
/// <reference types="node" />
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { addableAccounts, assetTypeOptions, groupAccounts } from './accounts';
import { parseMoney } from './currency';
import { financeHomeSummary } from './homeSummary';
import { getIncomeYears, getIncomeYoY, getSourcesForYear, getYearTotal } from './income';
import { getMonthlyChartData, getYearMetrics, getYears, getYearStats, MONTH_LABELS, PRIOR_YEAR_ENDING_BALANCES } from './metrics';
import { ASSET_TYPES, buildMonthlyRows, copyResultMessage, monthAccounts, previousMonthToCopy, transactionTotals } from './monthly';

// Runs shared-cases.json, the input → output cases utility-hub-ui runs too
// (src/domains/finance/utils/shared-cases.test.js), so the two ports can't drift.
// The web app is where expected values are refreshed (SHARED_CASES_UPDATE=1 npx vitest run shared-cases),
// which also rewrites this copy when the repos sit side by side.

type Fn = (...args: unknown[]) => unknown;
const IMPLEMENTATIONS: Record<string, Fn> = {
  parseMoney,
  groupAccounts,
  addableAccounts,
  assetTypeOptions,
  getIncomeYears,
  getSourcesForYear,
  getYearTotal,
  getIncomeYoY,
  getYears,
  getMonthlyChartData,
  getYearMetrics,
  getYearStats,
  buildMonthlyRows,
  monthAccounts,
  previousMonthToCopy,
  copyResultMessage,
  transactionTotals,
  financeHomeSummary,
} as unknown as Record<string, Fn>;
const CONSTANTS: Record<string, unknown> = { ASSET_TYPES, MONTH_LABELS, PRIOR_YEAR_ENDING_BALANCES };

interface Case {
  fn: string;
  note: string;
  args: unknown[] | null;
  expected: unknown;
}
interface CasesFile {
  now: string;
  fixtures: Record<string, unknown>;
  cases: Case[];
}

const file: CasesFile = JSON.parse(readFileSync(join(__dirname, 'shared-cases.json'), 'utf8'));
const webCopyPath = join(__dirname, '../../../../../utility-hub-ui/src/domains/finance/utils/shared-cases.json');

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const resolve = (arg: unknown): unknown => {
  if (isObject(arg) && typeof arg.$fixture === 'string') return structuredClone(file.fixtures[arg.$fixture]);
  if (isObject(arg) && Array.isArray(arg.$set)) return new Set(arg.$set);
  return structuredClone(arg);
};

// Compare as JSON (undefined is dropped, as it would be in the file), with
// numbers to 6 decimal places so float noise isn't drift.
const normalize = (value: unknown) =>
  JSON.parse(JSON.stringify(value ?? null, (_, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)));

const run = ({ fn, args }: Case) => normalize(args === null ? CONSTANTS[fn] : IMPLEMENTATIONS[fn](...args.map(resolve)));

describe('shared finance cases', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(file.now) });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('knows every function in the file', () => {
    const unknown = file.cases.map((c) => c.fn).filter((fn) => !(fn in IMPLEMENTATIONS) && !(fn in CONSTANTS));
    expect(unknown).toEqual([]);
  });

  (existsSync(webCopyPath) ? it : it.skip)('matches utility-hub-ui’s copy', () => {
    expect(JSON.parse(readFileSync(webCopyPath, 'utf8'))).toEqual(file);
  });

  it.each(file.cases.map((c) => [`${c.fn}: ${c.note}`, c] as const))('%s', (_, c) => {
    expect(run(c)).toEqual(c.expected);
  });
});
