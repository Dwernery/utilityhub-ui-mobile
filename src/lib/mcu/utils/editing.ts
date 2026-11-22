// Pure helpers for adding, editing and deleting MCU content.
// Mirrors utility-hub-ui's domains/mcu/utils/editing.js.
import type { ApiEpisode, ApiMovie, ApiShow, McuTrackerResponse } from '../types';

/** Phases the saga view knows about (see SAGAS). Other domains are Expanded Universe categories. */
export const PHASE_DOMAINS = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6'];

export type DraftKind = 'movie' | 'special' | 'show';

export const KIND_LABELS: Record<DraftKind, string> = { movie: 'Movie', special: 'Special', show: 'Show Season' };

export const isDraftKind = (v: unknown): v is DraftKind => v === 'movie' || v === 'special' || v === 'show';

/** "movie:12" → { kind: 'movie', id: 12 }; also "show:3", "episode:40". */
export function parseGlobalId(globalId: string | null | undefined): { kind: 'movie' | 'show' | 'episode'; id: number } | null {
  const match = /^(movie|show|episode):(\d+)$/.exec(globalId ?? '');
  return match ? { kind: match[1] as 'movie' | 'show' | 'episode', id: Number(match[2]) } : null;
}

export type RawItem =
  | { kind: 'movie'; movie: ApiMovie; domain: string }
  | { kind: 'show'; show: ApiShow; seasonNumber: number; episodes: ApiEpisode[]; domain: string };

/**
 * The raw API record behind a tracker item, which still has the full premiere date, the domain and
 * the episode ids that the normalized items drop.
 */
export function findRaw(data: McuTrackerResponse | null | undefined, globalId: string): RawItem | null {
  for (const domain of data?.domains ?? []) {
    const movie = domain.movies?.find((m) => m.globalId === globalId);
    if (movie) return { kind: 'movie', movie, domain: domain.domainName };
    const show = domain.shows?.find((s) => s.globalId === globalId);
    if (show) {
      const season = show.seasons?.[0];
      return {
        kind: 'show',
        show,
        seasonNumber: season?.seasonNumber ?? 1,
        episodes: season?.episodes ?? [],
        domain: domain.domainName,
      };
    }
  }
  return null;
}

/** Phase 1–6 first, then every other domain already in use, alphabetically. */
export function domainOptions(data: McuTrackerResponse | null | undefined): string[] {
  const others = new Set<string>();
  for (const domain of data?.domains ?? []) {
    const name = domain.domainName?.trim();
    if (name && !PHASE_DOMAINS.includes(name)) others.add(name);
  }
  return [...PHASE_DOMAINS, ...[...others].sort((a, b) => a.localeCompare(b))];
}

/** The number to suggest for a new episode: one past the highest so far. */
export function nextEpisodeNumber(episodes: { episodeNumber: number }[] | null | undefined): number {
  return (episodes ?? []).reduce((max, e) => Math.max(max, e.episodeNumber ?? 0), 0) + 1;
}

export interface ItemDraft {
  kind: DraftKind;
  title: string;
  /** `YYYY-MM-DD`, or '' when not chosen yet */
  premiereDate: string;
  runtime: string;
  season: string;
  domain: string;
  synopsis: string;
}

export function emptyDraft(kind: DraftKind): ItemDraft {
  return { kind, title: '', premiereDate: '', runtime: '', season: kind === 'show' ? '1' : '', domain: '', synopsis: '' };
}

export function draftFromRaw(raw: RawItem): ItemDraft {
  if (raw.kind === 'movie') {
    const { movie } = raw;
    return {
      kind: movie.type === 'SPECIAL' ? 'special' : 'movie',
      title: movie.title ?? '',
      premiereDate: movie.premiereDate ?? '',
      runtime: movie.runtime != null ? String(movie.runtime) : '',
      season: '',
      domain: raw.domain ?? '',
      synopsis: movie.synopsis ?? '',
    };
  }
  return {
    kind: 'show',
    title: raw.show.title ?? '',
    premiereDate: raw.show.premiereDate ?? '',
    runtime: '',
    season: String(raw.seasonNumber),
    domain: raw.domain ?? '',
    synopsis: raw.show.synopsis ?? '',
  };
}

/** A new season of the same show: same title and domain, next season number, everything else blank. */
export function nextSeasonDraft(raw: Extract<RawItem, { kind: 'show' }>): ItemDraft {
  return { ...emptyDraft('show'), title: raw.show.title ?? '', domain: raw.domain ?? '', season: String(raw.seasonNumber + 1) };
}

export interface MovieBody {
  title: string;
  premiereDate: string;
  runtime: number;
  synopsis: string;
  domain: string;
  special: boolean;
}

export interface ShowSeasonBody {
  title: string;
  season: number;
  premiereDate: string;
  synopsis: string;
  domain: string;
}

export interface EpisodeBody {
  episodeNumber: number;
  title: string;
  runtime: number;
}

type Checked<T> = { ok: true; body: T } | { ok: false; error: string };

const isPositiveInt = (value: string) => /^\d+$/.test(value.trim()) && Number(value) > 0;

/** Checks a draft and builds the request body. */
export function draftToRequest(draft: ItemDraft): Checked<MovieBody | ShowSeasonBody> {
  const title = draft.title.trim();
  const domain = draft.domain.trim();
  const synopsis = draft.synopsis.trim();
  if (!title) return { ok: false, error: 'Please enter a title' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.premiereDate)) return { ok: false, error: 'Please choose a premiere date' };
  if (!domain) return { ok: false, error: 'Please choose a phase or category' };
  if (!synopsis) return { ok: false, error: 'Please enter a synopsis' };

  if (draft.kind === 'show') {
    if (!isPositiveInt(draft.season)) return { ok: false, error: 'Season must be a whole number above 0' };
    return { ok: true, body: { title, season: Number(draft.season), premiereDate: draft.premiereDate, synopsis, domain } };
  }
  if (!isPositiveInt(draft.runtime)) return { ok: false, error: 'Runtime must be a whole number of minutes' };
  return {
    ok: true,
    body: { title, premiereDate: draft.premiereDate, runtime: Number(draft.runtime), synopsis, domain, special: draft.kind === 'special' },
  };
}

/** Checks an episode form and builds the request body. */
export function episodeToRequest(form: { episodeNumber: string; title: string; runtime: string }): Checked<EpisodeBody> {
  if (!isPositiveInt(form.episodeNumber)) return { ok: false, error: 'Episode number must be a whole number above 0' };
  if (!form.title.trim()) return { ok: false, error: 'Please enter an episode title' };
  if (!isPositiveInt(form.runtime)) return { ok: false, error: 'Runtime must be a whole number of minutes' };
  return { ok: true, body: { episodeNumber: Number(form.episodeNumber), title: form.title.trim(), runtime: Number(form.runtime) } };
}
