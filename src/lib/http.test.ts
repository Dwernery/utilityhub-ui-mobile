import { clearApiToken, getApiToken, setApiToken } from './apiToken';
import { checkApiToken, requestJson, requestVoid, UnauthorizedError } from './http';

const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async (key: string) => mockKeychain.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockKeychain.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockKeychain.delete(key)),
}));

const mockFetch = jest.fn();
beforeEach(async () => {
  mockKeychain.clear();
  await clearApiToken();
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

const respond = (status: number, body: unknown = {}) =>
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
const sentHeaders = () => (mockFetch.mock.calls[0][1].headers ?? {}) as Record<string, string>;

describe('requests', () => {
  it('send the saved token as a Bearer token', async () => {
    await setApiToken('s3cret');
    respond(200, []);

    await requestJson('/api/library/books', { errorMessage: 'x' });

    expect(sentHeaders().Authorization).toBe('Bearer s3cret');
  });

  it("keep sending JSON's content type on writes", async () => {
    await setApiToken('s3cret');
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

  it('send no Authorization header without a token', async () => {
    respond(401);

    await expect(requestJson('/api/library/books', { errorMessage: 'x' })).rejects.toThrow(UnauthorizedError);
    expect(sentHeaders()).not.toHaveProperty('Authorization');
  });
});

describe('a 401 response', () => {
  it('forgets the rejected token, so the unlock screen comes back', async () => {
    await setApiToken('old');
    respond(401, { status: 401, detail: 'The API token is not valid.' });

    await expect(requestJson('/api/library/books', { errorMessage: 'x' })).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getApiToken()).toBeNull();
    expect(mockKeychain.has('apiToken')).toBe(false);
  });

  it('keeps a newer token entered while the old request was in flight', async () => {
    await setApiToken('old');
    let reply!: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((resolve) => (reply = resolve)));

    const request = requestJson('/api/library/books', { errorMessage: 'x' });
    await setApiToken('new');
    reply({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => '',
    });

    await expect(request).rejects.toBeInstanceOf(UnauthorizedError);
    expect(getApiToken()).toBe('new');
  });
});

describe('other errors', () => {
  it('keep the token and report the status as before', async () => {
    await setApiToken('s3cret');
    respond(500, { status: 500 });

    const error = (await requestJson('/api/library/books', { errorMessage: 'Failed to load books' }).catch(
      (e: unknown) => e,
    )) as Error;

    expect(error).not.toBeInstanceOf(UnauthorizedError);
    expect(error.message).toBe('Failed to load books (status 500)');
    expect(getApiToken()).toBe('s3cret');
  });
});

describe('checkApiToken', () => {
  it('accepts a token the API accepts, without saving it', async () => {
    respond(200, []);

    await expect(checkApiToken('candidate')).resolves.toBe('valid');
    expect(sentHeaders().Authorization).toBe('Bearer candidate');
    expect(getApiToken()).toBeNull();
  });

  it('reports a token the API rejects', async () => {
    respond(401);

    await expect(checkApiToken('wrong')).resolves.toBe('invalid');
  });

  it('reports server trouble separately from a wrong token', async () => {
    respond(502);

    await expect(checkApiToken('candidate')).rejects.toThrow('status 502');
  });
});
