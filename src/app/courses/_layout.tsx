import { Stack } from 'expo-router';

import { detailSheet, formSheet, largeTitleScreen } from '@/constants/navigation';
import { accents } from '@/constants/theme';
import { CoursesProvider } from '@/lib/courses/context';

export { RouteError as ErrorBoundary } from '@/components/route-error';

export const unstable_settings = { anchor: 'index' };

export default function CoursesLayout() {
  return (
    <CoursesProvider>
      <Stack screenOptions={{ ...largeTitleScreen, headerTintColor: accents.courses }}>
        <Stack.Screen name="index" options={{ title: 'My Courses' }} />
        {/* As tall as its content: the course sheet is short, so a fixed 60% left empty space. */}
        <Stack.Screen name="course/[id]/index" options={{ ...detailSheet, sheetAllowedDetents: 'fitToContents' }} />
        <Stack.Screen name="course/[id]/edit" options={formSheet} />
        <Stack.Screen name="add" options={formSheet} />
        <Stack.Screen name="pick/[field]" options={formSheet} />
        <Stack.Screen name="creators" options={detailSheet} />
        <Stack.Screen name="groups" options={detailSheet} />
      </Stack>
    </CoursesProvider>
  );
}
