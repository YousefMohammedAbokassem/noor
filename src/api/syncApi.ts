import { apiClient } from './client';
import { ApiResponse, SyncPayload, SyncResponse } from '@/types/api';

export const syncApi = {
  pushPull: async (payload: SyncPayload) => {
    const { data } = await apiClient.post<ApiResponse<SyncResponse>>('/sync/push-pull', payload);
    return data.data;
  },
};
