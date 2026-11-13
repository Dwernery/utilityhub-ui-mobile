import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMcuTracker, updateContentStatus } from './api';
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
              seasons: show.seasons?.map((season) => ({
                ...season,
                episodes: season.episodes?.map((episode) =>
                  episode.globalId === globalId ? { ...episode, status } : episode,
                ),
              })),
            })),
          })),
        };
      });
    },
  });
}

