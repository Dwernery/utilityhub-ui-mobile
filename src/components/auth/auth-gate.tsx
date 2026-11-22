import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { loadSession, useSession } from '@/lib/session';

import { LockedScreen } from './locked-screen';
import { SignInScreen } from './sign-in-screen';

/**
 * Shows the app only while signed in. At launch it reads the saved session from the
 * Keychain, which is when iOS asks for Face ID / Touch ID (once per launch, not when
 * coming back from the background). A 401 from the API signs out (see lib/http.ts),
 * which lands back here.
 *
 * NativeTabs has no `Protected` routes (only Stack/Tabs/Drawer do), so the gate
 * replaces the tabs entirely: while signed out, no screen exists to fetch anything.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    void loadSession();
  }, []);

  // Signed out or locked: drop everything fetched in the session, so none of it is
  // shown again (or kept in memory) until someone signs in.
  useEffect(() => {
    if (session.status === 'signedOut' || session.status === 'locked') queryClient.clear();
  }, [session.status, queryClient]);

  switch (session.status) {
    case 'loading':
      return null; // the Keychain read (and the Face ID prompt) is in progress
    case 'locked':
      return <LockedScreen />;
    case 'signedOut':
      return <SignInScreen />;
    case 'signedIn':
      return children;
  }
}
