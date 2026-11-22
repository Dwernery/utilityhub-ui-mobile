import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useState } from 'react';

import * as api from './api';
import { getMcuTracker, updateContentStatus } from './api';
import { uploadFileToS3, validateFile, type PickedFile } from '../library/utils/s3Upload';
import type { EpisodeBody, MovieBody, ShowSeasonBody } from './utils/editing';
import { MCU_TRACKER_KEY } from './queryKeys';
import type { McuTrackerResponse } from './types';

export function useMcuTrackerData() {
  return useQuery({ queryKey: MCU_TRACKER_KEY, queryFn: getMcuTracker });
}

export function useUpdateContentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateContentStatus,
    onSuccess: (_, { globalId, status }) => {
      // Patch the one changed item in the cache instead of refetching everything.
      queryClient.setQueryData<McuTrackerResponse>(MCU_TRACKER_KEY, (oldData) => {
        if (!oldData?.domains) return oldData;
        return {
          ...oldData,
          domains: oldData.domains.map((domain) => ({
            ...domain,
            movies: domain.movies?.map((movie) => (movie.globalId === globalId ? { ...movie, status } : movie)),
            shows: domain.shows?.map((show) => ({
              ...show,
              episodes: show.episodes?.map((episode) => (episode.globalId === globalId ? { ...episode, status } : episode)),
            })),
          })),
        };
      });
    },
  });
}


// ── Create / edit / delete ────────────────────────────────────────────────

/** Poster images only (the Library helper also allows PDFs and Word files). */
export const POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type SaveItemInput =
  | { kind: 'movie'; id?: number; body: MovieBody; posterFile?: PickedFile | null }
  | { kind: 'show'; id?: number; body: ShowSeasonBody; posterFile?: PickedFile | null };

/**
 * Add or edit a movie, special or show season, then upload its poster if one was chosen
 * (presigned URL → S3 PUT → attach, like Library covers). A failed poster upload doesn't undo the
 * save, so it comes back as `posterError` instead of failing the mutation.
 */
export function useSaveMcuItem() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: async (input: SaveItemInput): Promise<{ globalId: string; posterError: Error | null }> => {
      const saved =
        input.kind === 'show'
          ? await (input.id ? api.updateShowSeason(input.id, input.body) : api.createShowSeason(input.body))
          : await (input.id ? api.updateMovie(input.id, input.body) : api.createMovie(input.body));
      let posterError: Error | null = null;
      if (input.posterFile) {
        try {
          const check = validateFile(input.posterFile, { allowedTypes: POSTER_TYPES });
          if (!check.valid) throw new Error(check.error);
          setUploadProgress(0.05);
          const { presignedUrl, s3Key } = await api.getPosterUploadUrl(input.posterFile.name, input.posterFile.mimeType);
          await uploadFileToS3(presignedUrl, input.posterFile, (f) => setUploadProgress(0.05 + f * 0.85));
          await api.attachPoster(input.kind, saved.id, s3Key);
          setUploadProgress(1);
        } catch (error) {
          posterError = error instanceof Error ? error : new Error(String(error));
        }
      }
      return { globalId: saved.globalId, posterError };
    },
    // Awaited before the caller's onSuccess, so the new item is already in the cache when its
    // detail sheet opens.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MCU_TRACKER_KEY }),
    onSettled: () => setUploadProgress(0),
  });
  return { ...mutation, uploadProgress };
}

/** Delete a movie/special, or a whole season with its episodes. */
export function useDeleteMcuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: 'movie' | 'show'; id: number }) =>
      kind === 'show' ? api.deleteShowSeason(id) : api.deleteMovie(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MCU_TRACKER_KEY }),
  });
}

/** Add (no `episodeId`) or edit an episode. */
export function useSaveEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ showId, episodeId, body }: { showId: number; episodeId?: number; body: EpisodeBody }) =>
      episodeId ? api.updateEpisode(episodeId, body) : api.createEpisode(showId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MCU_TRACKER_KEY }),
  });
}

export function useDeleteEpisode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (episodeId: number) => api.deleteEpisode(episodeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MCU_TRACKER_KEY }),
  });
}
