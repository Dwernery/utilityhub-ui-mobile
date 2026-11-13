import { Stack } from 'expo-router';

import { largeTitleScreen } from '@/constants/navigation';

export { RouteError as ErrorBoundary } from '@/components/route-error';

export default function HomeLayout() {
  return (
    <Stack screenOptions={largeTitleScreen}>
      <Stack.Screen name="index" options={{ title: 'Project SHIELD' }} />
    </Stack>
  );
}
