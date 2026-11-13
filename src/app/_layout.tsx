import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { icons } from '@/constants/icons';
import { ToastProvider } from '@/context/toast';
import { McuTrackerProvider } from '@/lib/mcu/context';
import { queryClient, subscribeAppFocus } from '@/lib/queryClient';

export { RouteError as ErrorBoundary } from '@/components/route-error';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(subscribeAppFocus, []);

  return (
    // ThemeProvider prevents the white flash between tabs and liquid-glass flicker in dark mode.
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <McuTrackerProvider>
            <NativeTabs minimizeBehavior="onScrollDown">
              <NativeTabs.Trigger name="(home)">
                <NativeTabs.Trigger.Icon sf={{ default: icons.home, selected: icons.homeSelected }} />
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="library">
                <NativeTabs.Trigger.Icon sf={{ default: icons.library, selected: icons.librarySelected }} />
                <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="finances">
                <NativeTabs.Trigger.Icon sf={icons.finances} />
                <NativeTabs.Trigger.Label>Finances</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>
              <NativeTabs.Trigger name="mcu">
                <NativeTabs.Trigger.Icon sf={{ default: icons.mcu, selected: icons.mcuSelected }} />
                <NativeTabs.Trigger.Label>MCU</NativeTabs.Trigger.Label>
              </NativeTabs.Trigger>
            </NativeTabs>
          </McuTrackerProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
