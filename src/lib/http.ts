import * as Device from 'expo-device';

import { API_URL } from './config';
import { clearSession, getSessionToken, saveSessionToken } from './session';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Message used when the server returns a non-2xx status. */
  errorMessage: string;
  /** Append `(status N): <server text>` to the error, as the web client did for mutations. */
  includeErrorDetail?: boolean;
}

/** The API refused the session (HTTP 401): the user has to sign in again. */
export class UnauthorizedError extends Error {
  constructor(message = 'Your session has ended. Sign in again.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

const authorization = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

/** A fresh session token the API sends once the current one is past half its lifetime. */
const REFRESHED_TOKEN_HEADER = 'X-Session-Token';

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
  const token = getSessionToken();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...authorization(token),
      ...((body !== undefined || method !== 'GET') && { 'Content-Type': 'application/json' }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // Forget the token so the sign-in screen appears, but only if it's still the one
    // this request used: a slow, old request mustn't wipe a session just started.
    if (getSessionToken() === token) await clearSession();
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    if (includeErrorDetail) {
      const errorText = await readErrorMessage(response);
      throw new Error(`${errorMessage} (status ${response.status}): ${errorText || 'Unknown error'}`);
    }
    throw new Error(`${errorMessage} (status ${response.status})`);
  }

  // Keep using the app and you stay signed in: swap in the fresh token, unless the
  // session changed while this request was in flight.
  const refreshed = response.headers.get(REFRESHED_TOKEN_HEADER);
  if (refreshed && token && getSessionToken() === token) void saveSessionToken(refreshed);

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

/** This phone's name, shown by the API as the session's device. */
export function describeThisDevice(): string {
  return `iOS app – ${Device.deviceName ?? Device.modelName ?? 'iPhone'}`;
}

/**
 * Signs in with the password and saves the session in the Keychain.
 * Rejects with the server's reason (e.g. "Wrong password.") or if it can't be reached.
 */
export async function login(password: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    // Asks for the token in the body; the web app gets a cookie instead.
    headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' },
    body: JSON.stringify({ password, deviceName: describeThisDevice() }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('Too many attempts. Wait a few minutes and try again.');
    throw new Error((await readErrorMessage(response)) || `The server had a problem (status ${response.status})`);
  }
  const { token } = (await response.json()) as { token: string };
  await saveSessionToken(token);
}
