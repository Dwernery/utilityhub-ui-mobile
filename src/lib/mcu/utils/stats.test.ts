import type { McuItem, WatchedMap } from '../types';
import { computeStats, isItemComplete, isItemPartial, nextStatus, percentage } from './stats';

const movie = { id: 'movie:1', globalId: 'movie:1', type: 'movie', title: 'M' } as McuItem;
const special = { id: 'movie:2', globalId: 'movie:2', type: 'special', title: 'S' } as McuItem;
const season = {
  id: 'show:1-season1',
  globalId: 'show:1',
  type: 'tv',
  title: 'T',
  episodes: [
    { globalId: 'episode:1', title: 'E1', episodeNumber: 1 },
    { globalId: 'episode:2', title: 'E2', episodeNumber: 2 },
  ],
} as McuItem;

describe('nextStatus', () => {
  it('cycles unwatched → in progress → watched → unwatched', () => {
    expect(nextStatus(undefined)).toBe('IN_PROGRESS');
    expect(nextStatus('UNWATCHED')).toBe('IN_PROGRESS');
    expect(nextStatus('IN_PROGRESS')).toBe('WATCHED');
    expect(nextStatus('WATCHED')).toBe('UNWATCHED');
  });
});

describe('completion', () => {
  it('a season is complete only when every episode is watched', () => {
    const half: WatchedMap = { 'episode:1': 'WATCHED' };
    const all: WatchedMap = { 'episode:1': 'WATCHED', 'episode:2': 'WATCHED' };

    expect(isItemComplete(season, half)).toBe(false);
    expect(isItemPartial(season, half)).toBe(true);
    expect(isItemComplete(season, all)).toBe(true);
    expect(isItemPartial(season, all)).toBe(false);
  });

  it('a movie is partial while in progress', () => {
    expect(isItemPartial(movie, { 'movie:1': 'IN_PROGRESS' })).toBe(true);
    expect(isItemComplete(movie, { 'movie:1': 'IN_PROGRESS' })).toBe(false);
  });
});

describe('computeStats', () => {
  it('counts movies, specials and episodes separately, and episodes as units', () => {
    const watched: WatchedMap = { 'movie:1': 'WATCHED', 'episode:2': 'WATCHED' };

    expect(computeStats([movie, special, season], watched)).toEqual({
      total: 4, // 1 movie + 1 special + 2 episodes
      done: 2,
      movies: 1,
      moviesDone: 1,
      specials: 1,
      specialsDone: 0,
      episodes: 2,
      episodesDone: 1,
    });
  });
});

describe('percentage', () => {
  it('rounds, and is 0 when there is nothing to count', () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(0, 0)).toBe(0);
  });
});
