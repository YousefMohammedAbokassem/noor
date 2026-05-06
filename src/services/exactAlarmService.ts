import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

export const exactAlarmService = {
  isSupported: Platform.OS === 'android',

  openSettings: async () => {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM);
      return true;
    } catch {
      return false;
    }
  },

  openBatteryOptimizationSettings: async () => {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
      );
      return true;
    } catch {
      return false;
    }
  },
};
