import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

/**
 * The session token every API request sends as `Authorization: Bearer <token>`.
 * The sign-in screen gets it from the API (password sign-in) and it is kept in the
 * iOS Keychain, locked behind Face ID / Touch ID: iOS asks for it each time the app
 * starts and reads the token. After that it stays in memory until the app is closed.
 *
 * Mirrors the web app's src/lib/session.js (which keeps no token: the web uses a cookie).
 */

const KEY = 'sessionToken';
/** Where the old shared API token was kept; removed on the first launch after the update. */
const LEGACY_KEY = 'apiToken';

const PROMPT = 'Unlock Project SHIELD';

// Readable only while the phone is unlocked, never synced to iCloud or restored from a
// backup onto another device, and (when the phone has Face ID or Touch ID) only after
// the owner's face or finger. Enrolling a new face or finger invalidates it, so that
// person can't get in without the password.
const BASE: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const WITH_BIOMETRICS: SecureStore.SecureStoreOptions = {
  ...BASE,
  requireAuthentication: true,
  authenticationPrompt: PROMPT,
};

export type SessionState =
  /** The Keychain hasn't been read yet. */
  | { status: 'loading' }
  /** No session: show the sign-in screen. */
  | { status: 'signedOut' }
  /** A session is saved, but Face ID was cancelled or failed: offer to try again. */
  | { status: 'locked' }
  | { status: 'signedIn'; token: string };

let current: SessionState = { status: 'loading' };
const listeners = new Set<() => void>();

function update(next: SessionState) {
  current = next;
  listeners.forEach((listener) => listener());
}

/**
 * Reads the session saved on an earlier launch; this is where Face ID is asked for.
 * An empty Keychain means signed out; a cancelled or failed Face ID means locked.
 */
export async function loadSession(): Promise<void> {
  update({ status: 'loading' });
  try {
    await SecureStore.deleteItemAsync(LEGACY_KEY, BASE);
  } catch {
    // Nothing to clean up.
  }
  try {
    const token = await SecureStore.getItemAsync(KEY, WITH_BIOMETRICS);
    update(token ? { status: 'signedIn', token } : { status: 'signedOut' });
  } catch {
    update({ status: 'locked' });
  }
}

export function getSessionState(): SessionState {
  return current;
}

/** The token to send, if signed in. */
export function getSessionToken(): string | null {
  return current.status === 'signedIn' ? current.token : null;
}

/**
 * Keeps a new token (after signing in, or a fresh one the API handed out) in memory at
 * once, and in the Keychain.
 */
export async function saveSessionToken(token: string): Promise<void> {
  update({ status: 'signedIn', token });
  // Overwriting a Face ID-protected item would make iOS ask for Face ID, so remove the
  // old one first (no prompt) and add the new one (no prompt either).
  await SecureStore.deleteItemAsync(KEY, BASE);
  if (SecureStore.canUseBiometricAuthentication()) {
    try {
      await SecureStore.setItemAsync(KEY, token, WITH_BIOMETRICS);
      return;
    } catch {
      // E.g. biometrics turned off meanwhile: fall through and keep it without.
    }
  }
  // No Face ID or Touch ID set up on this phone: the Keychain (locked by the
  // passcode) is the protection.
  await SecureStore.setItemAsync(KEY, token, BASE);
}

/** Signs out at once (screens stop showing data), then removes the token from the Keychain. */
export async function clearSession(): Promise<void> {
  update({ status: 'signedOut' });
  await SecureStore.deleteItemAsync(KEY, BASE);
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current state, re-rendering when it changes. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribeSession, getSessionState);
}
