import { apiClient } from './client';
import { ApiResponse } from '@/types/api';
import { PrayerSettings, ReminderSetting } from '@/types/models';

export const settingsApi = {
  updatePrayerSettings: async (payload: PrayerSettings) => {
    const { data } = await apiClient.put<ApiResponse<{ updated: true }>>('/settings/prayer', payload);
    return data.data;
  },
  updateReminders: async (payload: ReminderSetting[]) => {
    const { data } = await apiClient.put<ApiResponse<{ updated: true }>>('/settings/reminders', { reminders: payload });
    return data.data;
  },
};
