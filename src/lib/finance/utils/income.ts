import type { IncomeSource } from '../types';

type Sources = IncomeSource[] | null | undefined;

export const getIncomeYears = (incomeSources: Sources): number[] => {
  if (!incomeSources || incomeSources.length === 0) return [];
  return [...new Set(incomeSources.map((source) => source.year))].sort((a, b) => a - b);
};

export const getSourcesForYear = (incomeSources: Sources, year: number): IncomeSource[] =>
  (incomeSources || []).filter((source) => source.year === year).sort((a, b) => b.amount - a.amount);

export const getYearTotal = (incomeSources: Sources, year: number): number =>
  getSourcesForYear(incomeSources, year).reduce((sum, source) => sum + source.amount, 0);

export const getIncomeYoY = (incomeSources: Sources, year: number) => {
  const currentTotal = getYearTotal(incomeSources, year);
  const prevTotal = getYearTotal(incomeSources, year - 1);
  const change = currentTotal - prevTotal;
  const changePercent = prevTotal !== 0 ? (change / prevTotal) * 100 : 0;
  return { currentTotal, prevTotal, change, changePercent };
};
