// Centralized React Query keys for the library domain so call sites and
// cache invalidations can't drift out of sync.
export const BOOKS_KEY = ['books'] as const;
export const AUTHORS_KEY = ['authors'] as const;
export const SERIES_KEY = ['series'] as const;
