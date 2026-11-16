import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { loadApiToken, useApiToken } from '@/lib/apiToken';

import { UnlockScreen } from './unlock-screen';

/**
 * Shows the app only while an access token is saved; otherwise the unlock screen.
 * A 401 from the API forgets the token (see lib/http.ts), which lands back here.
 *
 * NativeTabs has no `Protected` routes (only Stack/Tabs/Drawer do), so the gate
 * replaces the tabs entirely: while locked, no screen exists to fetch anything.
 */
export function TokenGate({ children }: { children: ReactNode }) {
  const token = useApiToken();
  const queryClient = useQueryClient();

  useEffect(() => {
    void loadApiToken();
  }, []);

  // Locked: drop everything fetched with the old token, so none of it is shown
  // again (or kept in memory) until someone unlocks.
  useEffect(() => {
    if (token === null) queryClient.clear();
  }, [token, queryClient]);

  if (token === undefined) return null; // reading the Keychain takes a few milliseconds
  return token ? children : <UnlockScreen />;
}
