import { clearApiToken, getApiToken } from './apiToken';
import { API_URL } from './config';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Message used when the server returns a non-2xx status. */
  errorMessage: string;
  /** Append `(status N): <server text>` to the error, as the web client did for mutations. */
  includeErrorDetail?: boolean;
}

/** The API refused the access token (HTTP 401): the user has to unlock again. */
export class UnauthorizedError extends Error {
  constructor(message = 'Your access token was not accepted. Enter it again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

const authorization = (token: string | null | undefined): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

/**
 * Extracts a human-readable message from a failed response. The API returns RFC 9457
 * problem details (`{ status, detail, errors? }`); falls back to raw text otherwise.
 */
async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const problem = JSON.parse(text) as { detail?: string; title?: string; errors?: Record<string, string> };
    if (problem.errors) {
      return Object.entries(problem.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(', ');
    }
    return problem.detail || problem.title || text;
  } catch {
    return text;
  }
}

/** Shared fetch wrapper for every domain API client (replaces the repeated ok/text/content-type blocks). */
async function send(path: string, { method = 'GET', body, errorMessage, includeErrorDetail }: RequestOptions) {
  const token = getApiToken();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...authorization(token),
      ...((body !== undefined || method !== 'GET') && { 'Content-Type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // Forget the token so the unlock screen appears, but only if it's still the one
    // this request used: a slow, old request mustn't wipe a token just entered.
    if (getApiToken() === token) await clearApiToken();
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    if (includeErrorDetail) {
      const errorText = await readErrorMessage(response);
      throw new Error(`${errorMessage} (status ${response.status}): ${errorText || 'Unknown error'}`);
    }
    throw new Error(`${errorMessage} (status ${response.status})`);
  }

  return response;
}

/** Request that must return JSON. */
export async function requestJson<T>(path: string, options: RequestOptions): Promise<T> {
  const response = await send(path, options);
  return (await response.json()) as T;
}

/** Request whose response body is optional JSON; resolves `{ success: true }` when there's none. */
export async function requestMaybeJson<T = { success: true }>(
  path: string,
  options: RequestOptions,
): Promise<T | { success: true }> {
  const response = await send(path, options);
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return (await response.json()) as T;
  }
  return { success: true };
}

/** Request whose response body is ignored. */
export async function requestVoid(path: string, options: RequestOptions): Promise<void> {
  await send(path, options);
}

/**
 * Tries a token against the API before it is saved, so a typo gets a clear message.
 * Rejects if the server can't be reached or fails.
 */
export async function checkApiToken(token: string): Promise<'valid' | 'invalid'> {
  const response = await fetch(`${API_URL}/api/finance/accounts`, { headers: authorization(token) });
  if (response.status === 401) return 'invalid';
  if (!response.ok) throw new Error(`The server had a problem (status ${response.status})`);
  return 'valid';
}
