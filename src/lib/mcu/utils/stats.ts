// Watch-progress math shared by the header, saga rollups, and section cards.
// `watched` is a flat map keyed by item id (movies/specials) or episode.globalId (tv episodes).
import type { McuItem, WatchedMap, WatchStats, WatchStatus } from '../types';

export const STATUS_CYCLE: WatchStatus[] = ['UNWATCHED', 'IN_PROGRESS', 'WATCHED'];

export function getStatus(watched: WatchedMap, key: string): WatchStatus {
  return watched[key] ?? 'UNWATCHED';
}

export function nextStatus(current: WatchStatus | undefined): WatchStatus {
  const index = STATUS_CYCLE.indexOf(current ?? 'UNWATCHED');
  return STATUS_CYCLE[(index + 1) % STATUS_CYCLE.length];
}

/** TV: all episodes WATCHED. Movies/specials: status is WATCHED. */
export function isItemComplete(item: McuItem, watched: WatchedMap): boolean {
  if (item.type === 'tv') {
    if (!item.episodes?.length) return false;
    return item.episodes.every((episode) => getStatus(watched, episode.globalId) === 'WATCHED');
  }
  return getStatus(watched, item.id) === 'WATCHED';
}

/** TV: some (not all) episodes started. Movies/specials: status is IN_PROGRESS. */
export function isItemPartial(item: McuItem, watched: WatchedMap): boolean {
  if (item.type === 'tv') {
    if (!item.episodes?.length) return false;
    const startedCount = item.episodes.filter((episode) => getStatus(watched, episode.globalId) !== 'UNWATCHED').length;
    return startedCount > 0 && !isItemComplete(item, watched);
  }
  return getStatus(watched, item.id) === 'IN_PROGRESS';
}

/** Progress fraction (0–1) for the poster progress ring. */
export function getItemProgressFraction(item: McuItem, watched: WatchedMap): number {
  if (item.type !== 'tv') return 0.5;
  if (!item.episodes?.length) return 0;
  const watchedCount = item.episodes.filter((episode) => getStatus(watched, episode.globalId) === 'WATCHED').length;
  return watchedCount / item.episodes.length;
}

export function unitCount(item: McuItem): number {
  return item.type === 'tv' ? item.episodes.length : 1;
}

const EMPTY_STATS: WatchStats = {
  total: 0,
  done: 0,
  movies: 0,
  moviesDone: 0,
  episodes: 0,
  episodesDone: 0,
  specials: 0,
  specialsDone: 0,
};

export function computeStats(items: McuItem[], watched: WatchedMap): WatchStats {
  const stats = { ...EMPTY_STATS };

  for (const item of items) {
    stats.total += unitCount(item);

    if (item.type === 'tv') {
      stats.episodes += item.episodes.length;
      for (const episode of item.episodes) {
        if (getStatus(watched, episode.globalId) === 'WATCHED') {
          stats.episodesDone++;
          stats.done++;
        }
      }
    } else if (item.type === 'movie') {
      stats.movies++;
      if (getStatus(watched, item.id) === 'WATCHED') {
        stats.moviesDone++;
        stats.done++;
      }
    } else {
      stats.specials++;
      if (getStatus(watched, item.id) === 'WATCHED') {
        stats.specialsDone++;
        stats.done++;
      }
    }
  }

  return stats;
}

export function combineStats(statsList: WatchStats[]): WatchStats {
  return statsList.reduce(
    (acc, stats) => {
      const next = { ...acc };
      for (const key of Object.keys(EMPTY_STATS) as (keyof WatchStats)[]) next[key] += stats[key];
      return next;
    },
    { ...EMPTY_STATS },
  );
}

export function percentage(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
