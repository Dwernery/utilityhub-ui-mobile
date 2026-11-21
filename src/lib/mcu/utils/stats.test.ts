import type { McuItem, WatchedMap } from '../types';
import { computeStats, formatMinutes, getItemProgressFraction, isItemComplete, isItemPartial, nextStatus, percentage } from './stats';

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
      minutes: 0, // no runtimes in these fixtures
      minutesDone: 0,
    });
  });

  it('weights time watched by real runtimes, and in-progress movies count as 0', () => {
    const long = { ...movie, runtime: 180 } as McuItem;
    const short = {
      ...season,
      episodes: [
        { globalId: 'episode:1', title: 'E1', episodeNumber: 1, runtime: 30 },
        { globalId: 'episode:2', title: 'E2', episodeNumber: 2, runtime: 30 },
      ],
    } as McuItem;
    const stats = computeStats([long, short], { 'movie:1': 'IN_PROGRESS', 'episode:1': 'WATCHED', 'episode:2': 'WATCHED' });
    expect(stats.minutes).toBe(240);
    expect(stats.minutesDone).toBe(60);
  });
});

describe('getItemProgressFraction', () => {
  it('fills a show’s ring by runtime, not episode count', () => {
    const uneven = {
      ...season,
      episodes: [
        { globalId: 'episode:1', title: 'E1', episodeNumber: 1, runtime: 30 },
        { globalId: 'episode:2', title: 'E2', episodeNumber: 2, runtime: 90 },
      ],
    } as McuItem;
    expect(getItemProgressFraction(uneven, { 'episode:1': 'WATCHED' })).toBe(0.25);
  });
});

describe('formatMinutes', () => {
  it('uses minutes under an hour, hours and minutes under 10h, whole hours past that', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(150)).toBe('2h 30 min');
    expect(formatMinutes(4870)).toBe('81h');
  });
});

describe('percentage', () => {
  it('rounds, and is 0 when there is nothing to count', () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(0, 0)).toBe(0);
  });
});
