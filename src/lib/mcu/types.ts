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

/** One season of a show: each show record in the API is a single season. */
export interface ApiShow {
  id: number;
  globalId: string;
  title: string;
  seasonNumber: number;
  /** `YYYY-MM-DD` */
  premiereDate: string;
  synopsis: string | null;
  s3Url: string | null;
  episodes: ApiEpisode[];
}

export interface ApiMovie {
  id: number;
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
  /** The API's numeric id, for edit/delete calls. */
  id: number;
  title: string;
  globalId: string;
  episodeNumber: number;
  runtime?: number | null;
}

interface BaseItem {
  /** Unique per poster (React key). */
  id: string;
  /** The API's numeric id of the movie or season, for edit/delete calls. */
  recordId: number;
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

/** Phases show their saga's color (SAGAS), so they don't carry one. */
export interface Phase {
  num: number;
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
