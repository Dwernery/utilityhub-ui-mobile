import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useMcuTrackerData } from './hooks';
import type { ExpandedCategory, Phase, WatchedMap } from './types';
import type { TrackerView } from './utils/constants';
import { normalizeTrackerData } from './utils/normalizeTrackerData';
import { buildWatchedMap } from './utils/watchedMap';

interface McuTrackerContextValue {
  /** UI state: which tracker layout is showing. */
  view: TrackerView;
  setView: (view: TrackerView) => void;
  /** Server state, derived from the query cache on every change (never a separate copy). */
  watched: WatchedMap;
  /** The tracker content as posters, converted once per response for every screen that shows it. */
  phases: Phase[];
  expandedCategories: ExpandedCategory[];
}

const McuTrackerContext = createContext<McuTrackerContextValue | null>(null);

export function McuTrackerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TrackerView>('phases');
  const { data } = useMcuTrackerData();

  // Recomputed whenever the cached response changes: after a refetch, a status change,
  // or the app returning to the foreground.
  const watched = useMemo(() => buildWatchedMap(data), [data]);
  const { phases, expandedCategories } = useMemo(() => normalizeTrackerData(data), [data]);

  const value = useMemo(
    () => ({ view, setView, watched, phases, expandedCategories }),
    [view, watched, phases, expandedCategories],
  );

  return <McuTrackerContext.Provider value={value}>{children}</McuTrackerContext.Provider>;
}

export function useMcuTracker() {
  const ctx = useContext(McuTrackerContext);
  if (!ctx) throw new Error('useMcuTracker must be used within a McuTrackerProvider');
  return ctx;
}
