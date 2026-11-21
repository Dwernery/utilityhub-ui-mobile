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

/** Runtime in minutes; every production title has one, so a missing value just counts as 0. */
function minutesOf(runtime: number | null | undefined): number {
  return runtime ?? 0;
}

/** Progress fraction (0–1) for the poster progress ring: share of a show's runtime watched. */
export function getItemProgressFraction(item: McuItem, watched: WatchedMap): number {
  if (item.type !== 'tv') return 0.5;
  if (!item.episodes?.length) return 0;
  let total = 0;
  let done = 0;
  for (const episode of item.episodes) {
    const minutes = minutesOf(episode.runtime);
    total += minutes;
    if (getStatus(watched, episode.globalId) === 'WATCHED') done += minutes;
  }
  return total > 0 ? done / total : 0;
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
  minutes: 0,
  minutesDone: 0,
};

export function computeStats(items: McuItem[], watched: WatchedMap): WatchStats {
  const stats = { ...EMPTY_STATS };

  for (const item of items) {
    stats.total += unitCount(item);

    if (item.type === 'tv') {
      stats.episodes += item.episodes.length;
      for (const episode of item.episodes) {
        const minutes = minutesOf(episode.runtime);
        stats.minutes += minutes;
        if (getStatus(watched, episode.globalId) === 'WATCHED') {
          stats.episodesDone++;
          stats.done++;
          stats.minutesDone += minutes;
        }
      }
    } else {
      const minutes = minutesOf(item.runtime);
      stats.minutes += minutes;
      // Only finished titles count; in-progress ones add nothing until they're watched.
      if (getStatus(watched, item.id) === 'WATCHED') stats.minutesDone += minutes;
    }

    if (item.type === 'movie') {
      stats.movies++;
      if (getStatus(watched, item.id) === 'WATCHED') {
        stats.moviesDone++;
        stats.done++;
      }
    } else if (item.type === 'special') {
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

/** "45 min", "12 h", "1 h 30 min" under 10 h, whole hours past that. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h >= 10 || m === 0) return `${Math.round(minutes / 60)} h`;
  return `${h} h ${m} min`;
}

export function percentage(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}
