import type { ApiEpisode, ApiMovie, ApiShow, McuTrackerResponse, TvItem } from '../types';
import { normalizeTrackerData } from './normalizeTrackerData';
import { CATEGORY_PALETTE } from './categoryColors';

// Builders fill in the fields every API object has, so each fixture shows only what matters.
const idOf = (globalId: string) => Number(globalId.split(':')[1]);
const movie = (globalId: string, title: string, premiereDate: string, type: ApiMovie['type'] = 'MOVIE'): ApiMovie => ({
  id: idOf(globalId), globalId, title, premiereDate, type, runtime: null, synopsis: null, s3Url: null, status: 'UNWATCHED',
});
const episode = (n: number): ApiEpisode => ({
  id: n, globalId: `episode:${n}`, title: `Episode ${n}`, episodeNumber: n, runtime: null, status: 'UNWATCHED',
});
const show = (globalId: string, title: string, premiereDate: string, episodes: ApiEpisode[]): ApiShow => ({
  id: idOf(globalId), globalId, title, seasonNumber: 1, premiereDate, synopsis: null, s3Url: null, episodes,
});

const api: McuTrackerResponse = {
  domains: [
    { domainName: 'Phase 2', movies: [movie('movie:3', 'Iron Man 3', '2013-05-03')], shows: [] },
    {
      domainName: 'Phase 1',
      movies: [
        movie('movie:1', 'Iron Man', '2008-05-02'),
        // A January 1st date: the case where reading the year through new Date() went wrong.
        movie('movie:2', 'A One-Shot', '2008-01-01', 'SPECIAL'),
      ],
      shows: [show('show:7', 'Some Show', '2021-01-15', [episode(1), episode(2)])],
    },
    { domainName: 'Sony Spider-Verse', movies: [movie('movie:9', 'Into the Spider-Verse', '2018-12-14')], shows: [] },
  ],
};

describe('normalizeTrackerData', () => {
  const { phases, expandedCategories } = normalizeTrackerData(api);

  it('groups "Phase N" domains into phases, in phase order', () => {
    expect(phases.map((p) => p.num)).toEqual([1, 2]);
  });

  it('sorts items within a phase by premiere date', () => {
    expect(phases[0].items.map((i) => i.title)).toEqual(['A One-Shot', 'Iron Man', 'Some Show']);
  });

  it('keeps only the premiere year, read from the date string (time-zone safe)', () => {
    // Tests run in New York time; new Date('2008-01-01').getFullYear() would give 2007 here.
    expect(phases[0].items.map((i) => i.premiereDate)).toEqual([2008, 2008, 2021]);
  });

  it('marks specials and turns each TV season into its own item', () => {
    const [special, , season] = phases[0].items;

    expect(special.type).toBe('special');
    expect(season).toMatchObject({ type: 'tv', id: 'show:7-season1', seasonNumber: 1 });
    expect((season as TvItem).episodes.map((e) => e.globalId)).toEqual(['episode:1', 'episode:2']);
  });

  it('puts every other domain into the expanded universe, with defaults', () => {
    expect(expandedCategories).toHaveLength(1);
    expect(expandedCategories[0]).toMatchObject({
      id: 'sony-spider-verse',
      title: 'Sony Spider-Verse',
    });
    // Not pinned, so it takes a palette color (see categoryColors).
    expect(CATEGORY_PALETTE).toContain(expandedCategories[0].color);
  });

  it('handles a missing response', () => {
    expect(normalizeTrackerData(undefined)).toEqual({ phases: [], expandedCategories: [] });
  });
});
