import { Stack } from 'expo-router';

import { detailSheet, formSheet, largeTitleScreen } from '@/constants/navigation';
import { accents } from '@/constants/theme';

export { RouteError as ErrorBoundary } from '@/components/route-error';

export const unstable_settings = { anchor: 'index' };

export default function FinancesLayout() {
  return (
    <Stack screenOptions={{ ...largeTitleScreen, headerTintColor: accents.finances }}>
      {/* Dashboard / Expenses / History live in this one screen, switched by `?section=`. */}
      <Stack.Screen name="index" options={{ title: 'Finances' }} />
      <Stack.Screen name="month/[key]" options={{ ...detailSheet, sheetAllowedDetents: [0.75, 1] }} />
      <Stack.Screen name="transaction/[id]" options={formSheet} />
      <Stack.Screen name="income/[id]" options={formSheet} />
    </Stack>
  );
}
