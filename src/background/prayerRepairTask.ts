import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { prayerLogger } from '@/services/prayer/logger';
import { scheduleRepairService } from '@/services/prayer/ScheduleRepairService';

export const PRAYER_REPAIR_TASK_NAME = 'noor.prayer.repair';

TaskManager.defineTask(PRAYER_REPAIR_TASK_NAME, async () => {
  try {
    // Background repair is best-effort. On iOS it is opportunistic, and on both platforms
    // the OS may skip executions under battery or vendor restrictions. Core reliability comes
    // from the long local notification window plus repair on app open.
    await scheduleRepairService.repairNow('background_task', {
      allowLocationRefresh: false,
    });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    prayerLogger.error('Prayer background repair task failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
