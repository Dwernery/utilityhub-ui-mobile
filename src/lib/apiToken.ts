import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

/**
 * The access token every API request sends as `Authorization: Bearer <token>`.
 * Entered once on the unlock screen and kept in the iOS Keychain. Mirrors the
 * web app's src/lib/apiToken.js; the Keychain is async, so the token is read
 * once at launch (`loadApiToken`) and kept in memory after that.
 */

const KEY = 'apiToken';
// Readable only while the phone is unlocked, and never synced to iCloud or
// restored from a backup onto another device.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** `undefined` until the Keychain has been read, then the token or `null`. */
let current: string | null | undefined;
const listeners = new Set<() => void>();

function update(token: string | null) {
  current = token;
  listeners.forEach((listener) => listener());
}

/** Reads the token saved on an earlier launch. An unreadable Keychain counts as no token. */
export async function loadApiToken(): Promise<void> {
  try {
    update(await SecureStore.getItemAsync(KEY, OPTIONS));
  } catch {
    update(null);
  }
}

export function getApiToken(): string | null | undefined {
  return current;
}

export async function setApiToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token, OPTIONS);
  update(token);
}

/** Locks at once (screens stop showing data), then removes the token from the Keychain. */
export async function clearApiToken(): Promise<void> {
  update(null);
  await SecureStore.deleteItemAsync(KEY, OPTIONS);
}

export function subscribeApiToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current token (`undefined` while loading), re-rendering when it changes. */
export function useApiToken(): string | null | undefined {
  return useSyncExternalStore(subscribeApiToken, getApiToken);
}
