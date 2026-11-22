import type { McuTrackerResponse, WatchedMap } from '../types';

/**
 * Flatten the tracker response into `globalId → status` for every movie, special and
 * episode. A null status (never set) counts as UNWATCHED.
 *
 * This is derived data: always compute it from the query cache, never store a copy,
 * so every screen shows exactly what the server last said.
 */
export function buildWatchedMap(data: McuTrackerResponse | undefined): WatchedMap {
  const watched: WatchedMap = {};
  for (const domain of data?.domains ?? []) {
    for (const movie of domain.movies) watched[movie.globalId] = movie.status ?? 'UNWATCHED';
    for (const show of domain.shows) {
      for (const episode of show.episodes) watched[episode.globalId] = episode.status ?? 'UNWATCHED';
    }
  }
  return watched;
}
