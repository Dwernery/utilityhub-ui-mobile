import * as SecureStore from 'expo-secure-store';

import { clearApiToken, getApiToken, loadApiToken, setApiToken, subscribeApiToken } from './apiToken';

// An in-memory Keychain, so tests can see exactly what was stored and how.
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (key: string) => mockKeychain.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockKeychain.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockKeychain.delete(key)),
}));

beforeEach(async () => {
  mockKeychain.clear();
  await clearApiToken();
  jest.clearAllMocks();
});

describe('API token storage', () => {
  it('saves the token in the Keychain, for this device only (no iCloud sync or backups)', async () => {
    await setApiToken('abc');

    expect(getApiToken()).toBe('abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('apiToken', 'abc', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });

  it('reads a token saved on an earlier launch', async () => {
    mockKeychain.set('apiToken', 'from-last-launch');

    await loadApiToken();

    expect(getApiToken()).toBe('from-last-launch');
  });

  it('forgets the token in memory and in the Keychain', async () => {
    await setApiToken('abc');
    await clearApiToken();

    expect(getApiToken()).toBeNull();
    expect(mockKeychain.has('apiToken')).toBe(false);
  });

  it('locks immediately, before the Keychain delete finishes', async () => {
    await setApiToken('abc');
    const clearing = clearApiToken();

    expect(getApiToken()).toBeNull(); // no screen keeps showing data while the delete runs
    await clearing;
  });

  it('tells subscribers whenever the token changes', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeApiToken(listener);

    await setApiToken('abc');
    await clearApiToken();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await setApiToken('def');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('treats an unreadable Keychain as no token, instead of crashing at launch', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('mockKeychain unavailable'));

    await loadApiToken();

    expect(getApiToken()).toBeNull();
  });
});
