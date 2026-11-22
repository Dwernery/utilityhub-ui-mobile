import { requestJson, requestVoid } from '../http';
import type { ApiEpisode, ApiMovie, ApiShow, McuTrackerResponse, WatchStatus } from './types';
import type { EpisodeBody, MovieBody, ShowSeasonBody } from './utils/editing';

export function getMcuTracker() {
  return requestJson<McuTrackerResponse>('/api/mcu/tracker', { errorMessage: 'Failed to fetch MCU tracker data' });
}

export async function updateContentStatus({ globalId, status }: { globalId: string; status: WatchStatus }) {
  await requestVoid(`/api/mcu/tracker/${encodeURIComponent(globalId)}/status`, {
    method: 'PUT',
    body: { status },
    errorMessage: 'Failed to update content status',
    includeErrorDetail: true,
  });
  return 'Success' as const;
}

// ── Create / edit / delete ────────────────────────────────────────────────

const MCU = '/api/mcu';

function send<T>(method: 'POST' | 'PUT', path: string, body: unknown, errorMessage: string) {
  return requestJson<T>(`${MCU}${path}`, { method, body, errorMessage, includeErrorDetail: true });
}

function remove(path: string, errorMessage: string) {
  return requestVoid(`${MCU}${path}`, { method: 'DELETE', errorMessage, includeErrorDetail: true });
}

export const createMovie = (body: MovieBody) => send<ApiMovie>('POST', '/movies', body, 'Failed to add movie');
export const updateMovie = (id: number, body: MovieBody) => send<ApiMovie>('PUT', `/movies/${id}`, body, 'Failed to update movie');
export const deleteMovie = (id: number) => remove(`/movies/${id}`, 'Failed to delete movie');

export const createShowSeason = (body: ShowSeasonBody) => send<ApiShow>('POST', '/shows', body, 'Failed to add season');
export const updateShowSeason = (id: number, body: ShowSeasonBody) =>
  send<ApiShow>('PUT', `/shows/${id}`, body, 'Failed to update season');
export const deleteShowSeason = (id: number) => remove(`/shows/${id}`, 'Failed to delete season');

export const createEpisode = (showId: number, body: EpisodeBody) =>
  send<ApiEpisode>('POST', `/shows/${showId}/episodes`, body, 'Failed to add episode');
export const updateEpisode = (id: number, body: EpisodeBody) =>
  send<ApiEpisode>('PUT', `/episodes/${id}`, body, 'Failed to update episode');
export const deleteEpisode = (id: number) => remove(`/episodes/${id}`, 'Failed to delete episode');

/** Step 1 of a poster upload (same flow as Library covers). */
export function getPosterUploadUrl(fileName: string, fileType: string) {
  const params = new URLSearchParams({ fileName, fileType });
  return requestJson<{ presignedUrl: string; s3Key: string }>(`${MCU}/poster-upload-url?${params}`, {
    errorMessage: 'Failed to get upload URL',
    includeErrorDetail: true,
  });
}

/** Step 3: point a movie or season at the uploaded image. */
export function attachPoster(kind: 'movie' | 'show', id: number, s3Key: string) {
  return requestJson<unknown>(`${MCU}/${kind === 'show' ? 'shows' : 'movies'}/${id}/poster`, {
    method: 'POST',
    body: { s3Key },
    errorMessage: 'Failed to attach poster',
    includeErrorDetail: true,
  });
}
