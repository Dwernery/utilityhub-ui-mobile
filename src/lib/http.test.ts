import { login, requestJson, requestVoid, UnauthorizedError } from './http';
import { clearSession, getSessionToken, saveSessionToken } from './session';

const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  canUseBiometricAuthentication: jest.fn(() => true),
  getItemAsync: jest.fn(async (key: string) => mockKeychain.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockKeychain.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockKeychain.delete(key)),
}));
jest.mock('expo-device', () => ({ deviceName: 'Test iPhone', modelName: 'iPhone' }));

const mockFetch = jest.fn();
beforeEach(async () => {
  mockKeychain.clear();
  await clearSession();
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

const respond = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => ({ 'content-type': 'application/json', ...headers })[name.toLowerCase()] ?? null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
const sentOptions = () => mockFetch.mock.calls[0][1] as RequestInit;
const sentHeaders = () => (sentOptions().headers ?? {}) as Record<string, string>;

describe('requests', () => {
  it('send the saved session as a Bearer token', async () => {
    await saveSessionToken('s3cret');
    respond(200, []);

    await requestJson('/api/library/books', { errorMessage: 'x' });

    expect(sentHeaders().Authorization).toBe('Bearer s3cret');
  });

  it("keep sending JSON's content type on writes", async () => {
    await saveSessionToken('s3cret');
    respond(200);

    await requestVoid('/api/library/books/1', {
      method: 'DELETE',
      errorMessage: 'x',
    });

    expect(sentHeaders()).toMatchObject({
      Authorization: 'Bearer s3cret',
      'Content-Type': 'application/json',
    });
  });

  it('send no Authorization header when signed out', async () => {
    respond(401);

    await expect(requestJson('/api/library/books', { errorMessage: 'x' })).rejects.toThrow(UnauthorizedError);
    expect(sentHeaders()).not.toHaveProperty('Authorization');
  });

  it('save the fresh token the API hands out, so the session keeps going', async () => {
    await saveSessionToken('old');
    respond(200, [], { 'x-session-token': 'fresh' });

    await requestJson('/api/library/books', { errorMessage: 'x' });

    expect(getSessionToken()).toBe('fresh');
  });
});

describe('a 401 response', () => {
  it('signs out, so the sign-in screen comes back', async () => {
    await saveSessionToken('old');
    respond(401, { status: 401, detail: 'Your session has expired.' });

    await expect(requestJson('/api/library/books', { errorMessage: 'x' })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getSessionToken()).toBeNull();
    expect(mockKeychain.has('sessionToken')).toBe(false);
  });

  it('keeps a newer session started while the old request was in flight', async () => {
    await saveSessionToken('old');
    let reply!: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((resolve) => (reply = resolve)));

    const request = requestJson('/api/library/books', { errorMessage: 'x' });
    await saveSessionToken('new');
    reply({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => '',
    });

    await expect(request).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getSessionToken()).toBe('new');
  });
});

describe('other errors', () => {
  it('keep the session and report the status as before', async () => {
    await saveSessionToken('s3cret');
    respond(500, { status: 500 });

    const error = (await requestJson('/api/library/books', { errorMessage: 'Failed to load books' }).catch(
      (e: unknown) => e,
    )) as Error;

    expect(error).not.toBeInstanceOf(UnauthorizedError);
    expect(error.message).toBe('Failed to load books (status 500)');
    expect(getSessionToken()).toBe('s3cret');
  });
});

describe('login', () => {
  it('asks for the token in the body, then saves it', async () => {
    respond(200, { deviceName: 'iOS app – Test iPhone', token: 'new-session' });

    await login('hunter2');

    expect(mockFetch.mock.calls[0][0]).toMatch(/\/api\/auth\/login$/);
    expect(sentHeaders()['X-Client']).toBe('mobile');
    expect(JSON.parse(sentOptions().body as string)).toEqual({
      password: 'hunter2',
      deviceName: 'iOS app – Test iPhone',
    });
    expect(getSessionToken()).toBe('new-session');
  });

  it("shows the server's reason for a wrong password", async () => {
    respond(401, { status: 401, detail: 'Wrong password.' });

    await expect(login('nope')).rejects.toThrow('Wrong password.');
    expect(getSessionToken()).toBeNull();
  });

  it('explains being rate limited', async () => {
    respond(429, { status: 429 });

    await expect(login('nope')).rejects.toThrow('Wait a few minutes');
  });
});
