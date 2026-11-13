import type { McuTrackerResponse } from '../types';

export interface InProgressEntry {
  /** Stable key: movie or episode globalId */
  key: string;
  /** Movie title, or the show title for an episode */
  title: string;
  /** Domain name for movies; episode title for episodes (same as the web card) */
  subtitle: string;
  s3Url?: string | null;
  kind: 'movie' | 'episode';
  seasonNumber?: number;
}

/** Movies and episodes the API reports as IN_PROGRESS (ported from MCUHomeCard). */
export function getInProgress(data: McuTrackerResponse | undefined): InProgressEntry[] {
  return (data?.domains ?? []).flatMap((domain) => [
    ...(domain.movies ?? [])
      .filter((m) => m.status === 'IN_PROGRESS')
      .map<InProgressEntry>((m) => ({
        key: m.globalId,
        title: m.title,
        subtitle: domain.domainName ?? '',
        s3Url: m.s3Url,
        kind: 'movie',
      })),
    ...(domain.shows ?? []).flatMap((show) =>
      (show.seasons ?? []).flatMap((season) =>
        (season.episodes ?? [])
          .filter((e) => e.status === 'IN_PROGRESS')
          .map<InProgressEntry>((e) => ({
            key: e.globalId,
            title: show.title,
            subtitle: e.title,
            s3Url: show.s3Url,
            kind: 'episode',
            seasonNumber: season.seasonNumber,
          })),
      ),
    ),
  ]);
}
