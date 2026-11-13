import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { useAuthors, useSeries } from './hooks';

export type PickField = 'author' | 'series';

/** What the `/library/pick/[field]` sheet needs from the form that opened it. */
export interface PickRequest {
  field: PickField;
  value: string | null;
  onSelect: (value: string) => void;
}

/**
 * Library-wide UI state.
 * - The web version also held `selectedBookId` / `isEditingInDialog`; on native those are routes
 *   (`/library/book/[id]`, `/library/book/[id]/edit`).
 * - `pickRequest` is the hand-off between a form and the searchable picker sheet: the form calls
 *   `openPicker`, the sheet reads `pickRequest` and calls `onSelect` with the choice.
 */
interface LibraryContextValue {
  authorOptions: string[];
  seriesOptions: string[];
  pickRequest: PickRequest | null;
  openPicker: (request: PickRequest) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { data: authors = [] } = useAuthors();
  const { data: series = [] } = useSeries();
  const [pickRequest, setPickRequest] = useState<PickRequest | null>(null);

  const authorOptions = useMemo(() => [...new Set(authors.map((a) => a.fullName))].sort(), [authors]);
  const seriesOptions = useMemo(() => [...new Set(series.map((s) => s.name))].sort(), [series]);

  const openPicker = useCallback((request: PickRequest) => {
    setPickRequest(request);
    router.push({ pathname: '/library/pick/[field]', params: { field: request.field } });
  }, []);

  const value = useMemo(
    () => ({ authorOptions, seriesOptions, pickRequest, openPicker }),
    [authorOptions, seriesOptions, pickRequest, openPicker],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within a LibraryProvider');
  return ctx;
}
