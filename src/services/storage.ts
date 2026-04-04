import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';
import { AuthTokens } from '@/types/models';

const KEYS = {
  authTokens: 'noor.auth.tokens',
  authStore: 'noor.auth.store.secure',
  deviceId: 'noor.device.id.secure',
  syncQueue: 'noor.sync.queue',
  installMarker: 'noor.app.install.marker',
} as const;

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const parseJsonSafely = <T>(raw: string | null, fallback: T | null = null): T | null => {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const secureJsonStorage: StateStorage = {
  getItem: async (name) => SecureStore.getItemAsync(name, secureStoreOptions),
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value, secureStoreOptions);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name, secureStoreOptions);
  },
};

const isAuthTokens = (value: unknown): value is AuthTokens => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthTokens>;

  return (
    typeof candidate.accessToken === 'string' &&
    candidate.accessToken.length > 20 &&
    typeof candidate.refreshToken === 'string' &&
    candidate.refreshToken.length > 20 &&
    typeof candidate.expiresAt === 'string'
  );
};

export const storage = {
  setItem: async <T>(key: string, value: T) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  getItem: async <T>(key: string): Promise<T | null> => {
    const value = await AsyncStorage.getItem(key);
    const parsed = parseJsonSafely<T>(value);

    if (value && parsed === null) {
      await AsyncStorage.removeItem(key);
    }

    return parsed;
  },
  removeItem: async (key: string) => AsyncStorage.removeItem(key),
  keys: KEYS,
  securePersistStorage: secureJsonStorage,
};

export const secureSession = {
  saveTokens: async (tokens: AuthTokens) => {
    await SecureStore.setItemAsync(KEYS.authTokens, JSON.stringify(tokens), secureStoreOptions);
  },
  getTokens: async (): Promise<AuthTokens | null> => {
    const raw = await SecureStore.getItemAsync(KEYS.authTokens, secureStoreOptions);
    const parsed = parseJsonSafely<AuthTokens>(raw);

    if (!isAuthTokens(parsed)) {
      await SecureStore.deleteItemAsync(KEYS.authTokens, secureStoreOptions);
      return null;
    }

    return parsed;
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(KEYS.authTokens, secureStoreOptions);
  },
};

export const secureValueStore = {
  getString: async (key: string) => SecureStore.getItemAsync(key, secureStoreOptions),
  setString: async (key: string, value: string) =>
    SecureStore.setItemAsync(key, value, secureStoreOptions),
  remove: async (key: string) => SecureStore.deleteItemAsync(key, secureStoreOptions),
  keys: KEYS,
};
