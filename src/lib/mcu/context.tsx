import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useMcuTrackerData } from './hooks';
import type { ApiDomain, McuItem, WatchedMap, WatchStatus } from './types';
import type { TrackerView } from './utils/constants';
import { getStatus, nextStatus } from './utils/stats';

function normalizeStatus(status: unknown): WatchStatus {
  return status === 'WATCHED' || status === 'IN_PROGRESS' ? status : 'UNWATCHED';
}

function extractStatusFromDomains(domains: ApiDomain[] | unknown): WatchedMap {
  const status: WatchedMap = {};

  if (!Array.isArray(domains)) {
    console.warn('Invalid domains format: expected array, got', typeof domains);
    return status;
  }

  for (const domain of domains as ApiDomain[]) {
    if (!domain) continue;

    // Movies and specials are keyed by globalId
    for (const movie of domain.movies ?? []) {
      if (movie?.globalId) status[movie.globalId] = normalizeStatus(movie.status);
    }

    // TV episodes are keyed by their own globalId
    for (const show of domain.shows ?? []) {
      for (const season of show?.seasons ?? []) {
        for (const episode of season?.episodes ?? []) {
          if (episode?.globalId) status[episode.globalId] = normalizeStatus(episode.status);
        }
      }
    }
  }

  return status;
}

interface McuTrackerContextValue {
  view: TrackerView;
  setView: (view: TrackerView) => void;
  watched: WatchedMap;
  setWatched: React.Dispatch<React.SetStateAction<WatchedMap>>;
  hydrateWatched: (apiData: { domains?: ApiDomain[] } | undefined) => void;
  toggleItem: (item: McuItem) => void;
  toggleEpisode: (episodeGlobalId: string) => void;
}

const McuTrackerContext = createContext<McuTrackerContextValue | null>(null);

export function McuTrackerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TrackerView>('phases');
  const [watched, setWatched] = useState<WatchedMap>({});
  const { data } = useMcuTrackerData();
  const hasHydrated = useRef(false);

  // Seed status from raw API domains without clobbering local edits
  const hydrateWatched = useCallback((apiData: { domains?: ApiDomain[] } | undefined) => {
    const initialStatus = extractStatusFromDomains(apiData?.domains ?? []);
    setWatched((prev) => ({ ...initialStatus, ...prev }));
  }, []);

  // Auto-hydrate once when MCU data is first fetched
  useEffect(() => {
    if (data && !hasHydrated.current) {
      hasHydrated.current = true;
      hydrateWatched(data);
    }
  }, [data, hydrateWatched]);

  const toggleItem = useCallback((item: McuItem) => {
    setWatched((prev) => {
      const next = { ...prev };

      if (item.type === 'tv') {
        // TV: toggle every episode of the season together
        const allWatched = item.episodes.every((episode) => getStatus(prev, episode.globalId) === 'WATCHED');
        const target: WatchStatus = allWatched ? 'UNWATCHED' : 'WATCHED';
        for (const episode of item.episodes) next[episode.globalId] = target;
        return next;
      }

      // Movies/specials cycle through statuses
      next[item.id] = nextStatus(prev[item.id]);
      return next;
    });
  }, []);

  const toggleEpisode = useCallback((episodeGlobalId: string) => {
    setWatched((prev) => ({ ...prev, [episodeGlobalId]: nextStatus(prev[episodeGlobalId]) }));
  }, []);

  const value = useMemo(
    () => ({ view, setView, watched, setWatched, hydrateWatched, toggleItem, toggleEpisode }),
    [view, watched, hydrateWatched, toggleItem, toggleEpisode],
  );

  return <McuTrackerContext.Provider value={value}>{children}</McuTrackerContext.Provider>;
}

export function useMcuTracker() {
  const ctx = useContext(McuTrackerContext);
  if (!ctx) throw new Error('useMcuTracker must be used within a McuTrackerProvider');
  return ctx;
}
