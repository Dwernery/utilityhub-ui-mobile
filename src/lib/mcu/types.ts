export type WatchStatus = 'UNWATCHED' | 'IN_PROGRESS' | 'WATCHED';

// ── Raw API shape (`GET /api/mcu/tracker`) ─────────────────────────────────

// Mirrors the API's MCUTrackerResponseDTO tree.

export interface ApiEpisode {
  id: number;
  globalId: string;
  title: string;
  episodeNumber: number;
  runtime: number | null;
  /** null when never set; treat as UNWATCHED (the DB column is nullable). */
  status: WatchStatus | null;
}

/** The API sends exactly one season per show object. */
export interface ApiSeason {
  seasonNumber: number;
  episodes: ApiEpisode[];
}

export interface ApiShow {
  globalId: string;
  title: string;
  /** `YYYY-MM-DD` */
  premiereDate: string;
  synopsis: string | null;
  s3Url: string | null;
  seasons: ApiSeason[];
}

export interface ApiMovie {
  globalId: string;
  title: string;
  type: 'MOVIE' | 'SPECIAL';
  /** `YYYY-MM-DD` */
  premiereDate: string;
  runtime: number | null;
  synopsis: string | null;
  s3Url: string | null;
  /** null when never set; treat as UNWATCHED (the DB column is nullable). */
  status: WatchStatus | null;
}

export interface ApiDomain {
  domainName: string;
  movies: ApiMovie[];
  shows: ApiShow[];
}

export interface McuTrackerResponse {
  domains: ApiDomain[];
}

// ── Normalized shape used by the UI ────────────────────────────────────────

export type ItemType = 'movie' | 'special' | 'tv';

export interface Episode {
  title: string;
  globalId: string;
  episodeNumber: number;
  runtime?: number | null;
}

interface BaseItem {
  id: string;
  globalId: string;
  title: string;
  /** Normalized to the premiere year */
  premiereDate: number;
  synopsis?: string | null;
  s3Url?: string | null;
}

export interface MovieItem extends BaseItem {
  type: 'movie' | 'special';
  runtime?: number | null;
}

/** One season of a show. */
export interface TvItem extends BaseItem {
  type: 'tv';
  seasonNumber: number;
  episodes: Episode[];
}

export type McuItem = MovieItem | TvItem;

export interface Phase {
  num: number;
  color: string;
  items: McuItem[];
}

export interface ExpandedCategory {
  id: string;
  title: string;
  color: string;
  items: McuItem[];
}

/** Flat map: movie/special id or episode globalId → status. */
export type WatchedMap = Record<string, WatchStatus>;

export interface WatchStats {
  total: number;
  done: number;
  movies: number;
  moviesDone: number;
  episodes: number;
  episodesDone: number;
  specials: number;
  specialsDone: number;
  /** Runtime of everything counted, in minutes. */
  minutes: number;
  minutesDone: number;
}
