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
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body !== undefined || method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
