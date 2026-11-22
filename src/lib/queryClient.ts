import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { UnauthorizedError } from './http';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Native has no window focus; focusManager below maps "focus" to the app returning to the foreground.
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      // One retry for blips, but never for a rejected session: it would just be rejected again.
      retry: (failureCount, error) => !(error instanceof UnauthorizedError) && failureCount < 1,
    },
  },
});

/** Call once at app start: refetch stale queries when the app comes back to the foreground. */
export function subscribeAppFocus() {
  const onChange = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}
