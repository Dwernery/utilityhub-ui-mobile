import type { SFSymbol } from 'expo-symbols';

import type { ItemType, WatchStats, WatchStatus } from '../types';

// Merges the web's `constants.js` + `statConstants.js`. Icons are SF Symbol names instead of lucide components.

export const TYPE_META: Record<ItemType, { icon: SFSymbol; label: string }> = {
  movie: { icon: 'film', label: 'Movie' },
  special: { icon: 'sparkles', label: 'Special' },
  tv: { icon: 'tv', label: 'Series' },
};

/** Left-to-right progression (status pickers). Menus list them reversed: most likely first. */
export const WATCH_STATUSES: WatchStatus[] = ['UNWATCHED', 'IN_PROGRESS', 'WATCHED'];
export const STATUS_MENU_ORDER: WatchStatus[] = [...WATCH_STATUSES].reverse();

export const STATUS_LABELS: Record<WatchStatus, string> = {
  UNWATCHED: 'Unwatched',
  IN_PROGRESS: 'In Progress',
  WATCHED: 'Watched',
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

/**
 * The MCU Phases view, in order. A saga with no phases in the data yet is hidden, so the
 * Mutant Saga appears once Phase 7 content is added. Its phase numbers are a guess; leave
 * `years` out until they're known.
 */
export const SAGAS: { id: string; title: string; years?: string; color: string; phaseNums: number[] }[] = [
  { id: 'infinity', title: 'The Infinity Saga', years: '2008–2019', color: '#4C8DFF', phaseNums: [1, 2, 3] },
  { id: 'multiverse', title: 'The Multiverse Saga', years: '2021–2027', color: '#8B7CF6', phaseNums: [4, 5, 6] },
  { id: 'mutant', title: 'The Mutant Saga', color: '#2DD4BF', phaseNums: [7, 8, 9] },
];
