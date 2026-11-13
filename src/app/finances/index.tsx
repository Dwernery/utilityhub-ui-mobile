import { Stack, useLocalSearchParams } from 'expo-router';

import { SECTION_KEYS, type SectionKey } from '@/components/finance/finance-switcher';
import Dashboard from '@/components/finance/screens/dashboard-screen';
import IncomeExpenses from '@/components/finance/screens/income-expenses-screen';
import IncomeHistory from '@/components/finance/screens/income-history-screen';

const TITLES: Record<SectionKey, string> = {
  dashboard: 'Finances',
  expenses: 'Income & Expenses',
  history: 'Income History',
};

/**
 * Finances root. Dashboard / Expenses / History are one screen whose content swaps on `?section=`
 * (set by the segmented control), so switching never pushes or pops (no "Back" animation).
 */
export default function Finances() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const key: SectionKey = SECTION_KEYS.includes(section as SectionKey) ? (section as SectionKey) : 'dashboard';

  return (
    <>
      <Stack.Screen options={{ title: TITLES[key] }} />
      {key === 'dashboard' ? <Dashboard /> : key === 'expenses' ? <IncomeExpenses /> : <IncomeHistory />}
    </>
  );
}
