import type { ExpandedCategory, McuItem, Phase, WatchedMap, WatchStats } from '../types';
import { SAGAS } from './constants';
import { combineStats, computeStats, isItemComplete, typeSummary } from './stats';

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

/** The color a phase is shown in: its saga's (phases have none of their own). */
export function phaseColor(num: number): string {
  return (SAGAS.find((saga) => saga.phaseNums.includes(num)) ?? SAGAS[0]).color;
}

/** Accent for a phase or category, as shown on its posters. */
const groupColor = (group: Phase | ExpandedCategory) => ('num' in group ? phaseColor(group.num) : group.color);

/** Saga sections for the "MCU Phases" view (ported from the web Tracker). Sagas with no phases yet are left out. */
export function sagaSections(phases: Phase[], watched: WatchedMap): TrackerSection[] {
  return SAGAS.map((saga) => {
    const cards = saga.phaseNums
      .map((num) => phases.find((p) => p.num === num))
      .filter((p): p is Phase => !!p)
      .map((phase) => ({
        key: `phase-${phase.num}`,
        label: `PHASE ${phase.num}`,
        color: saga.color,
        items: phase.items,
        stats: computeStats(phase.items, watched),
      }));
    return {
      key: `saga-${saga.id}`,
      title: saga.title,
      subtitle: [saga.years, `Phases ${saga.phaseNums[0]}–${saga.phaseNums[saga.phaseNums.length - 1]}`].filter(Boolean).join(' · '),
      color: saga.color,
      cards,
      isCategory: false,
      stats: combineStats(cards.map((c) => c.stats)),
    };
  }).filter((section) => section.cards.length > 0);
}

/** One section per Expanded Universe category. */
export function categorySections(categories: ExpandedCategory[], watched: WatchedMap): TrackerSection[] {
  return categories.map((category) => {
    const stats = computeStats(category.items, watched);
    return {
      key: `saga-${category.id}`,
      title: category.title,
      subtitle: typeSummary(stats),
      color: category.color,
      cards: [{ key: category.id, label: category.title.toUpperCase(), color: category.color, items: category.items, stats }],
      isCategory: true,
      stats,
    };
  });
}

/** Keep only titles passing `keep`, dropping cards and sections left empty. Stats stay whole-section. */
function filterSections(sections: TrackerSection[], keep: (item: McuItem) => boolean): TrackerSection[] {
  return sections
    .map((section) => ({
      ...section,
      cards: section.cards
        .map((card) => ({ ...card, items: card.items.filter(keep) }))
        .filter((card) => card.items.length > 0),
    }))
    .filter((section) => section.cards.length > 0);
}

/**
 * Keep only unfinished titles (unwatched or partly watched), dropping cards and sections left
 * empty. Stats stay those of the whole section, so percentages don't change with the filter.
 */
export function unfinishedOnly(sections: TrackerSection[], watched: WatchedMap): TrackerSection[] {
  return filterSections(sections, (item) => !isItemComplete(item, watched));
}

/**
 * Keep only titles matching `query` (case-insensitive), like Library's search: a show matches
 * on its title or any episode title. Empty cards and sections drop out; stats stay whole-section,
 * as with "Not Finished". A blank query keeps everything.
 */
export function matchingOnly(sections: TrackerSection[], query: string): TrackerSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return filterSections(
    sections,
    (item) =>
      item.title.toLowerCase().includes(q) ||
      (item.type === 'tv' && item.episodes.some((e) => e.title.toLowerCase().includes(q))),
  );
}

/** How many titles (posters) the sections list. */
export function countItems(sections: TrackerSection[]): number {
  return sections.reduce((n, s) => n + s.cards.reduce((m, c) => m + c.items.length, 0), 0);
}

/**
 * Every section and card open, so a search match isn't hidden in a collapsed phase, with
 * `overrides` (what was toggled during this search) on top.
 */
export function allExpanded(sections: TrackerSection[], overrides: Record<string, boolean> = {}): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of sections) {
    out[s.key] = overrides[s.key] ?? true;
    for (const c of s.cards) out[c.key] = overrides[c.key] ?? true;
  }
  return out;
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

/** Find an item (movie, special or TV season) by its `id`, with the color its posters use (saga or category). */
export function findItem(
  phases: Phase[],
  categories: ExpandedCategory[],
  id: string,
): { item: McuItem; color: string } | null {
  for (const group of [...phases, ...categories]) {
    // Match globalId too: it's one per season and doesn't change when the season is renumbered.
    const item = group.items.find((i) => i.globalId === id || i.id === id);
    if (item) return { item, color: groupColor(group) };
  }
  return null;
}
