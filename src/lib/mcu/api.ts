import { requestJson, requestVoid } from '../http';
import type { McuTrackerResponse, WatchStatus } from './types';

export function getMcuTracker() {
  return requestJson<McuTrackerResponse>('/api/mcu/tracker', { errorMessage: 'Failed to fetch MCU tracker data' });
}

export async function updateContentStatus({ globalId, status }: { globalId: string; status: WatchStatus }) {
  await requestVoid('/api/mcu/tracker/status', {
    method: 'PUT',
    body: { globalId, status },
    errorMessage: 'Failed to update content status',
    includeErrorDetail: true,
  });
  return 'Success' as const;
}
