import { Stack } from 'expo-router';

import { detailSheet, formSheet, largeTitleScreen } from '@/constants/navigation';
import { accents } from '@/constants/theme';
import { LibraryProvider } from '@/lib/library/context';

export { RouteError as ErrorBoundary } from '@/components/route-error';

export const unstable_settings = { anchor: 'index' };

export default function LibraryLayout() {
  return (
    <LibraryProvider>
      <Stack screenOptions={{ ...largeTitleScreen, headerTintColor: accents.library }}>
        {/* Inventory / Metrics / Randomize live in this one screen, switched by `?section=`. */}
        <Stack.Screen name="index" options={{ title: 'My Books' }} />
        <Stack.Screen name="book/[id]/index" options={detailSheet} />
        <Stack.Screen name="book/[id]/edit" options={formSheet} />
        <Stack.Screen name="add" options={formSheet} />
        <Stack.Screen name="author/[name]" options={detailSheet} />
        <Stack.Screen name="series/[name]" options={detailSheet} />
        <Stack.Screen name="start-reading" options={detailSheet} />
        <Stack.Screen name="pick/[field]" options={formSheet} />
      </Stack>
    </LibraryProvider>
  );
}
