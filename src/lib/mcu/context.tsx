import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useMcuTrackerData } from './hooks';
import type { WatchedMap } from './types';
import type { TrackerView } from './utils/constants';
import { buildWatchedMap } from './utils/watchedMap';

interface McuTrackerContextValue {
  /** UI state: which tracker layout is showing. */
  view: TrackerView;
  setView: (view: TrackerView) => void;
  /** Server state, derived from the query cache on every change (never a separate copy). */
  watched: WatchedMap;
}

const McuTrackerContext = createContext<McuTrackerContextValue | null>(null);

export function McuTrackerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TrackerView>('phases');
  const { data } = useMcuTrackerData();

  // Recomputed whenever the cached response changes: after a refetch, a status change,
  // or the app returning to the foreground.
  const watched = useMemo(() => buildWatchedMap(data), [data]);

  const value = useMemo(() => ({ view, setView, watched }), [view, watched]);

  return <McuTrackerContext.Provider value={value}>{children}</McuTrackerContext.Provider>;
}

export function useMcuTracker() {
  const ctx = useContext(McuTrackerContext);
  if (!ctx) throw new Error('useMcuTracker must be used within a McuTrackerProvider');
  return ctx;
}
