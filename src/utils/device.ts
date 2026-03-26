import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getLocales } from 'expo-localization';
import { Platform } from 'react-native';
import { secureValueStore } from '@/services/storage';
import { DeviceMeta } from '@/types/models';

const randomSegment = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(12);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
};

const generateDeviceId = () => `device-${randomSegment()}`;

export const getDeviceId = async () => {
  const existing = await secureValueStore.getString(secureValueStore.keys.deviceId);
  if (existing) return existing;

  const id = generateDeviceId();
  await secureValueStore.setString(secureValueStore.keys.deviceId, id);
  return id;
};

export const buildDeviceMeta = async (pushToken?: string): Promise<DeviceMeta> => {
  const locale = getLocales()[0]?.languageTag ?? 'unknown';

  return {
    deviceId: await getDeviceId(),
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: Constants.expoConfig?.version ?? Device.osVersion ?? '1.0.0',
    locale,
    pushToken,
  };
};
