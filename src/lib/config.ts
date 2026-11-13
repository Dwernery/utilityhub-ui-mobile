/**
 * Base URL of the UtilityHub backend (same server the web app uses).
 * Set `EXPO_PUBLIC_API_URL` in `.env.local` — native has no origin, so this must be absolute.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

if (__DEV__ && !API_URL) {
  console.warn('EXPO_PUBLIC_API_URL is not set — API requests will fail. Add it to .env.local.');
}
