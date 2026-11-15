import { useToast } from '@/context/toast';

import { useUpdateContentStatus } from './hooks';
import type { WatchStatus } from './types';

/**
 * Change the watch status of a movie/special/episode: PUT to the API, then toast.
 * On success the mutation patches the query cache (see useUpdateContentStatus), and every
 * screen that reads it, including the derived `watched` map, updates from there.
 */
export function useChangeStatus() {
  const { mutate, isPending, variables } = useUpdateContentStatus();
  const addToast = useToast();

  const change = (globalId: string, status: WatchStatus, { episode = false }: { episode?: boolean } = {}) =>
    mutate(
      { globalId, status },
      {
        onSuccess: () => addToast(`${episode ? 'Episode status' : 'Status'} updated to ${status}`, 'success'),
        onError: () =>
          addToast(`Failed to update ${episode ? 'episode ' : ''}status. Please try again.`, 'error'),
      },
    );

  return { change, isPending, pendingId: isPending ? variables?.globalId : undefined };
}
