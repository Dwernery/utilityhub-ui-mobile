import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { updateContentStatus } from './api';
import { McuTrackerProvider, useMcuTracker } from './context';
import { MCU_TRACKER_KEY } from './queryKeys';
import type { McuTrackerResponse, WatchStatus } from './types';
import { useChangeStatus } from './useChangeStatus';

// No network in unit tests: the API module is replaced with mocks.
jest.mock('./api', () => ({ getMcuTracker: jest.fn(), updateContentStatus: jest.fn() }));
const mockAddToast = jest.fn();
jest.mock('@/context/toast', () => ({ useToast: () => mockAddToast }));

const tracker = (movieStatus: WatchStatus | null, episodeStatus: WatchStatus = 'UNWATCHED'): McuTrackerResponse => ({
  domains: [
    {
      domainName: 'Phase 1',
      movies: [
        {
          globalId: 'movie:1', title: 'Iron Man', type: 'MOVIE', premiereDate: '2008-05-02',
          runtime: null, synopsis: null, s3Url: null, status: movieStatus,
        },
      ],
      shows: [
        {
          globalId: 'show:1', title: 'A Show', premiereDate: '2021-01-15', synopsis: null, s3Url: null,
          seasons: [{ seasonNumber: 1, episodes: [
            { id: 5, globalId: 'episode:5', title: 'Pilot', episodeNumber: 1, runtime: null, status: episodeStatus },
          ] }],
        },
      ],
    },
  ],
});

/** A real query cache, pre-filled as if the tracker had already been fetched. */
function setup(initial: McuTrackerResponse) {
  // gcTime: Infinity stops the cache scheduling cleanup timers, which would keep Jest
  // from exiting after the tests finish.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity },
    },
  });
  queryClient.setQueryData(MCU_TRACKER_KEY, initial);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <McuTrackerProvider>{children}</McuTrackerProvider>
    </QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => jest.clearAllMocks());

describe('MCU watch status', () => {
  it('reads statuses from the server data, treating null as UNWATCHED', async () => {
    const { wrapper } = setup(tracker(null, 'IN_PROGRESS'));
    const { result } = await renderHook(() => useMcuTracker(), { wrapper });

    expect(result.current.watched).toEqual({ 'movie:1': 'UNWATCHED', 'episode:5': 'IN_PROGRESS' });
  });

  it('follows the server when the data is refreshed (e.g. a change made in the web UI)', async () => {
    const { queryClient, wrapper } = setup(tracker('UNWATCHED'));
    const { result } = await renderHook(() => useMcuTracker(), { wrapper });

    // A background refetch brings in a status that was changed somewhere else.
    await act(() => queryClient.setQueryData(MCU_TRACKER_KEY, tracker('WATCHED')));

    // React Query notifies subscribers on its next tick, so wait for the re-render.
    await waitFor(() => expect(result.current.watched['movie:1']).toBe('WATCHED'));
  });

  it('updates every reader after a successful change, and toasts', async () => {
    jest.mocked(updateContentStatus).mockResolvedValue('Success');
    const { queryClient, wrapper } = setup(tracker('UNWATCHED'));
    const { result } = await renderHook(() => ({ tracker: useMcuTracker(), status: useChangeStatus() }), { wrapper });

    await act(() => result.current.status.change('movie:1', 'IN_PROGRESS'));

    await waitFor(() => expect(result.current.tracker.watched['movie:1']).toBe('IN_PROGRESS'));
    // The query cache itself changed, so screens that read it directly (like Home) agree.
    const cached = queryClient.getQueryData<McuTrackerResponse>(MCU_TRACKER_KEY);
    expect(cached?.domains[0].movies[0].status).toBe('IN_PROGRESS');
    expect(mockAddToast).toHaveBeenCalledWith('Status updated to IN_PROGRESS', 'success');
  });

  it('leaves the status unchanged when the server rejects the change', async () => {
    jest.mocked(updateContentStatus).mockRejectedValue(new Error('offline'));
    const { wrapper } = setup(tracker('UNWATCHED'));
    const { result } = await renderHook(() => ({ tracker: useMcuTracker(), status: useChangeStatus() }), { wrapper });

    await act(() => result.current.status.change('movie:1', 'WATCHED'));

    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Failed to update status. Please try again.', 'error'));
    expect(result.current.tracker.watched['movie:1']).toBe('UNWATCHED');
  });
});
