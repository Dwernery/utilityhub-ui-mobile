import { Stack } from 'expo-router';

import { detailSheet, largeTitleScreen } from '@/constants/navigation';
import { accents, mcuColors } from '@/constants/theme';

export { RouteError as ErrorBoundary } from '@/components/route-error';

export const unstable_settings = { anchor: 'tracker' };

/** MCU is always dark, like the web tracker. */
export default function McuLayout() {
  return (
    <Stack
      screenOptions={{
        ...largeTitleScreen,
        headerTintColor: accents.mcu,
        headerTitleStyle: { color: mcuColors.label },
        headerLargeTitleStyle: { color: mcuColors.label },
        contentStyle: { backgroundColor: mcuColors.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="tracker" options={{ title: 'MCU Tracker' }} />
      <Stack.Screen
        name="item/[globalId]"
        options={{ ...detailSheet, contentStyle: { backgroundColor: mcuColors.surface } }}
      />
    </Stack>
  );
}
