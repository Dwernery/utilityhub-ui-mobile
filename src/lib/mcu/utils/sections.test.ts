import type { ExpandedCategory, McuItem, Phase, WatchedMap } from '../types';
import {
  allExpanded,
  categorySections,
  countItems,
  defaultExpanded,
  findItem,
  matchingOnly,
  sagaSections,
  unfinishedOnly,
} from './sections';

const movie = (n: number, title: string) =>
  ({ id: `movie:${n}`, recordId: n, globalId: `movie:${n}`, type: 'movie', title, premiereDate: 2008 }) as McuItem;
const season = {
  id: 'show:1-season1',
  globalId: 'show:1',
  type: 'tv',
  title: 'Loki',
  seasonNumber: 1,
  premiereDate: 2021,
  episodes: [{ globalId: 'episode:1', title: 'Glorious Purpose', episodeNumber: 1 }],
} as McuItem;

const phases: Phase[] = [
  { num: 1, items: [movie(1, 'Iron Man'), movie(2, 'Iron Man 2')] },
  { num: 4, items: [season] },
];
const categories: ExpandedCategory[] = [{ id: 'netflix', title: 'Netflix', color: '#999999', items: [movie(3, 'Daredevil')] }];

describe('sagaSections', () => {
  it('leaves out sagas with no phases yet (the Mutant Saga until Phase 7 exists)', () => {
    expect(sagaSections(phases, {}).map((s) => s.key)).toEqual(['saga-infinity', 'saga-multiverse']);
  });

  it('opens only sections and phases with something left to watch', () => {
    const watched: WatchedMap = { 'movie:1': 'WATCHED', 'movie:2': 'WATCHED' };
    expect(defaultExpanded(sagaSections(phases, watched))).toEqual({
      'saga-infinity': false,
      'phase-1': false,
      'saga-multiverse': true,
      'phase-4': true,
    });
  });
});

describe('matchingOnly', () => {
  const sections = () => sagaSections(phases, {});

  it('keeps matching titles case-insensitively, dropping empty phases and sagas', () => {
    const shown = matchingOnly(sections(), 'IRON');
    expect(shown.map((s) => s.key)).toEqual(['saga-infinity']);
    expect(countItems(shown)).toBe(2);
    expect(shown[0].stats).toEqual(sections()[0].stats); // whole-section stats
  });

  it('matches a season by episode title, and keeps everything for a blank query', () => {
    const shown = matchingOnly(sections(), 'glorious');
    expect(shown[0].cards[0].items.map((i) => i.globalId)).toEqual(['show:1']);
    expect(matchingOnly(sections(), '  ')).toEqual(sections());
  });

  it('works on categories, and combines with Not Finished', () => {
    expect(countItems(matchingOnly(categorySections(categories, {}), 'dare'))).toBe(1);
    const watched: WatchedMap = { 'movie:1': 'WATCHED' };
    expect(countItems(unfinishedOnly(matchingOnly(sagaSections(phases, watched), 'iron'), watched))).toBe(1);
  });
});

describe('allExpanded', () => {
  it('opens every section and card, with toggles from this search on top', () => {
    const sections = sagaSections(phases, {});
    expect(allExpanded(sections)).toEqual({
      'saga-infinity': true,
      'phase-1': true,
      'saga-multiverse': true,
      'phase-4': true,
    });
    expect(allExpanded(sections, { 'phase-1': false })['phase-1']).toBe(false);
  });
});

describe('findItem', () => {
  it("returns the saga's color for phase items, so the detail sheet matches the poster", () => {
    expect(findItem(phases, categories, 'show:1')?.color).toBe('#8B7CF6'); // Phase 4 → Multiverse Saga
    expect(findItem(phases, categories, 'movie:3')?.color).toBe('#999999');
  });
});

describe('unfinishedOnly', () => {
  it('drops watched titles and empty phases but keeps whole-section stats', () => {
    const watched: WatchedMap = { 'movie:1': 'WATCHED', 'movie:2': 'IN_PROGRESS', 'episode:1': 'WATCHED' };
    const sections = sagaSections(phases, watched);
    const filtered = unfinishedOnly(sections, watched);

    expect(filtered.map((s) => s.key)).toEqual(['saga-infinity']);
    expect(filtered[0].cards.map((c) => c.items.map((i) => i.title))).toEqual([['Iron Man 2']]);
    expect(filtered[0].stats).toEqual(sections[0].stats);
  });
});
