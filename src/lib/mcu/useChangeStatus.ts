import { useToast } from '@/context/toast';

import { useMcuTracker } from './context';
import { useUpdateContentStatus } from './hooks';
import type { WatchStatus } from './types';

/**
 * Change the watch status of a movie/special/episode: PUT to the API, then (on success) update the
 * local `watched` map and toast — the same sequence as the web Tracker and detail modal.
 */
export function useChangeStatus() {
  const { mutate, isPending, variables } = useUpdateContentStatus();
  const { setWatched } = useMcuTracker();
  const addToast = useToast();

  const change = (globalId: string, status: WatchStatus, { episode = false }: { episode?: boolean } = {}) =>
    mutate(
      { globalId, status },
      {
        onSuccess: () => {
          setWatched((prev) => ({ ...prev, [globalId]: status }));
          addToast(`${episode ? 'Episode status' : 'Status'} updated to ${status}`, 'success');
        },
        onError: () =>
          addToast(`Failed to update ${episode ? 'episode ' : ''}status. Please try again.`, 'error'),
      },
    );

  return { change, isPending, pendingId: isPending ? variables?.globalId : undefined };
}
