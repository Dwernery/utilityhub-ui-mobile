import type { SFSymbol } from 'expo-symbols';

import type { ItemType, WatchStats, WatchStatus } from '../types';

// Merges the web's `constants.js` + `statConstants.js`. Icons are SF Symbol names instead of lucide components.

export const TYPE_META: Record<ItemType, { icon: SFSymbol; label: string }> = {
  movie: { icon: 'film', label: 'Movie' },
  special: { icon: 'sparkles', label: 'Special' },
  tv: { icon: 'tv', label: 'Series' },
};

export const STATUS = {
  UNWATCHED: 'UNWATCHED',
  IN_PROGRESS: 'IN_PROGRESS',
  WATCHED: 'WATCHED',
} as const satisfies Record<WatchStatus, WatchStatus>;

export const STATUS_LABELS: Record<WatchStatus, string> = {
  UNWATCHED: 'Unwatched',
  IN_PROGRESS: 'In Progress',
  WATCHED: 'Watched',
};

export const MODAL_TITLE = {
  movie: 'Movie Details',
  tv: 'Series Details',
};

export const MODAL_LABELS = {
  MARK_UNWATCHED: 'Mark unwatched',
  MARK_WATCHED: 'Mark watched',
  SEASON: 'Season',
  EPS: 'eps',
};

export type TrackerView = 'phases' | 'categories';

export const VIEWS: { key: TrackerView; label: string }[] = [
  { key: 'phases', label: 'MCU Phases' },
  { key: 'categories', label: 'Expanded Universe' },
];

/** Breakdown categories for stats display, shared by the tracker header and the Home card. */
export const BREAKDOWN: { key: keyof WatchStats; doneKey: keyof WatchStats; label: string; icon: SFSymbol }[] = [
  { key: 'movies', doneKey: 'moviesDone', label: 'Movies', icon: 'film' },
  { key: 'specials', doneKey: 'specialsDone', label: 'Specials', icon: 'sparkles' },
  { key: 'episodes', doneKey: 'episodesDone', label: 'Episodes', icon: 'tv' },
];

export const SAGAS = [
  { id: 'infinity', title: 'The Infinity Saga', years: '2008–2019', color: '#4C8DFF', phaseNums: [1, 2, 3] },
  { id: 'multiverse', title: 'The Multiverse Saga', years: '2021–2027', color: '#8B7CF6', phaseNums: [4, 5, 6] },
];
