import type { McuTrackerResponse } from '../types';
import { buildWatchedMap } from './watchedMap';

describe('buildWatchedMap', () => {
  it('maps every movie and episode to its status, with null as UNWATCHED', () => {
    const data: McuTrackerResponse = {
      domains: [
        {
          domainName: 'Phase 1',
          movies: [
            { globalId: 'movie:1', title: 'A', type: 'MOVIE', premiereDate: '2008-05-02', runtime: null, synopsis: null, s3Url: null, status: 'WATCHED' },
            { globalId: 'movie:2', title: 'B', type: 'SPECIAL', premiereDate: '2008-06-01', runtime: null, synopsis: null, s3Url: null, status: null },
          ],
          shows: [
            {
              globalId: 'show:1', title: 'S', premiereDate: '2021-01-15', synopsis: null, s3Url: null,
              seasons: [{ seasonNumber: 1, episodes: [{ id: 3, globalId: 'episode:3', title: 'E', episodeNumber: 1, runtime: null, status: 'IN_PROGRESS' }] }],
            },
          ],
        },
      ],
    };

    expect(buildWatchedMap(data)).toEqual({ 'movie:1': 'WATCHED', 'movie:2': 'UNWATCHED', 'episode:3': 'IN_PROGRESS' });
  });

  it('is empty before the data has loaded', () => {
    expect(buildWatchedMap(undefined)).toEqual({});
  });
});
