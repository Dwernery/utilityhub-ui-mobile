import * as SecureStore from 'expo-secure-store';

import { clearSession, getSessionState, getSessionToken, loadSession, saveSessionToken } from './session';

// An in-memory Keychain, so tests can see exactly what was stored and how.
const mockKeychain = new Map<string, { value: string; options: unknown }>();
let mockBiometrics = true;
let mockFaceIdFails = false;
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  canUseBiometricAuthentication: jest.fn(() => mockBiometrics),
  getItemAsync: jest.fn(async (key: string) => {
    const item = mockKeychain.get(key);
    if (item && (item.options as { requireAuthentication?: boolean }).requireAuthentication && mockFaceIdFails) {
      throw new Error('User canceled the operation.');
    }
    return item?.value ?? null;
  }),
  setItemAsync: jest.fn(async (key: string, value: string, options: unknown) => {
    mockKeychain.set(key, { value, options });
  }),
  deleteItemAsync: jest.fn(async (key: string) => void mockKeychain.delete(key)),
}));

beforeEach(async () => {
  mockKeychain.clear();
  mockBiometrics = true;
  mockFaceIdFails = false;
  await clearSession();
  jest.clearAllMocks();
});

describe('session storage', () => {
  it('keeps the token behind Face ID, on this device only (no iCloud sync or backups)', async () => {
    await saveSessionToken('abc');

    expect(getSessionToken()).toBe('abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sessionToken', 'abc', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: true,
      authenticationPrompt: 'Unlock Project SHIELD',
    });
  });

  it('removes the old token before saving a new one, so iOS does not ask for Face ID to overwrite it', async () => {
    await saveSessionToken('first');
    jest.clearAllMocks();

    await saveSessionToken('second');

    const deleted = (SecureStore.deleteItemAsync as jest.Mock).mock.invocationCallOrder[0];
    const saved = (SecureStore.setItemAsync as jest.Mock).mock.invocationCallOrder[0];
    expect(deleted).toBeLessThan(saved);
    expect(mockKeychain.get('sessionToken')?.value).toBe('second');
  });

  it('still saves the token on a phone without Face ID or Touch ID', async () => {
    mockBiometrics = false;

    await saveSessionToken('abc');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('sessionToken', 'abc', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });

  it('reads the session saved on an earlier launch, and removes the old API token', async () => {
    mockKeychain.set('sessionToken', { value: 'from-last-launch', options: {} });
    mockKeychain.set('apiToken', { value: 'legacy', options: {} });

    await loadSession();

    expect(getSessionState()).toEqual({ status: 'signedIn', token: 'from-last-launch' });
    expect(mockKeychain.has('apiToken')).toBe(false);
  });

  it('is signed out when nothing is saved', async () => {
    await loadSession();

    expect(getSessionState()).toEqual({ status: 'signedOut' });
  });

  it('is locked (not signed out) when Face ID is cancelled or fails, keeping the session', async () => {
    await saveSessionToken('abc');
    mockFaceIdFails = true;

    await loadSession();

    expect(getSessionState()).toEqual({ status: 'locked' });
    expect(getSessionToken()).toBeNull();
    expect(mockKeychain.has('sessionToken')).toBe(true);
  });

  it('signs out in memory and in the Keychain', async () => {
    await saveSessionToken('abc');
    await clearSession();

    expect(getSessionToken()).toBeNull();
    expect(mockKeychain.has('sessionToken')).toBe(false);
  });
});
