import type { ExpandedCategory, McuItem, Phase, WatchedMap, WatchStats } from '../types';
import { SAGAS } from './constants';
import { combineStats, computeStats } from './stats';

export interface PhaseCard {
  key: string;
  label: string;
  color: string;
  items: McuItem[];
  stats: WatchStats;
}

export interface TrackerSection {
  key: string;
  title: string;
  subtitle: string;
  color: string;
  cards: PhaseCard[];
  /** Categories render their posters directly (no per-phase card). */
  isCategory: boolean;
  stats: WatchStats;
}

/** Saga sections for the "MCU Phases" view (ported from the web Tracker). */
export function sagaSections(phases: Phase[], watched: WatchedMap): TrackerSection[] {
  return SAGAS.map((saga) => {
    const cards = saga.phaseNums
      .map((num) => phases.find((p) => p.num === num))
      .filter((p): p is Phase => !!p)
      .map((phase) => ({
        key: `phase-${phase.num}`,
        label: `PHASE ${phase.num}`,
        color: phase.color,
        items: phase.items,
        stats: computeStats(phase.items, watched),
      }));
    return {
      key: `saga-${saga.id}`,
      title: saga.title,
      subtitle: `${saga.years} · Phases ${saga.phaseNums.join('–')}`,
      color: saga.color,
      cards,
      isCategory: false,
      stats: combineStats(cards.map((c) => c.stats)),
    };
  });
}

/** One section per Expanded Universe category. */
export function categorySections(categories: ExpandedCategory[], watched: WatchedMap): TrackerSection[] {
  return categories.map((category) => {
    const stats = computeStats(category.items, watched);
    const metrics = `${stats.movies} movies · ${stats.episodes} episodes · ${stats.specials} specials`;
    return {
      key: `saga-${category.id}`,
      title: category.title,
      subtitle: category.blurb ? `${category.blurb} · ${metrics}` : metrics,
      color: category.color,
      cards: [{ key: category.id, label: category.title.toUpperCase(), color: category.color, items: category.items, stats }],
      isCategory: true,
      stats,
    };
  });
}

/** Sections (and phase cards) start expanded when they still have something unwatched. */
export function defaultExpanded(sections: TrackerSection[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of sections) {
    out[s.key] = s.stats.done < s.stats.total;
    for (const c of s.cards) out[c.key] = c.stats.done < c.stats.total;
  }
  return out;
}

/** Find an item (movie, special or TV season) by its `id`, with the color of the phase/category it's in. */
export function findItem(
  phases: Phase[],
  categories: ExpandedCategory[],
  id: string,
): { item: McuItem; color: string } | null {
  for (const group of [...phases, ...categories]) {
    const item = group.items.find((i) => i.id === id);
    if (item) return { item, color: group.color };
  }
  return null;
}
