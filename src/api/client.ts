import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { clearAccountScopedData } from '@/services/accountCleanup';
import { secureSession } from '@/services/storage';

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? (typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production');

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const resolveBaseUrl = () => {
  const configuredBaseUrl =
    envBaseUrl ??
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
    'http://localhost:4000/api/v1';

  try {
    const parsed = new URL(configuredBaseUrl);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isProductionLike = appEnvironment === 'production' || (!__DEV__ && appEnvironment !== 'development');
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
    const host = hostUri?.split(':')[0];

    if (isLocalHost && host && !isProductionLike) {
      parsed.hostname = host;
    }

    if (isProductionLike && (parsed.protocol !== 'https:' || isLocalHost)) {
      throw new Error('Production builds require an HTTPS API base URL that is not localhost.');
    }

    return normalizeBaseUrl(parsed.toString());
  } catch (error) {
    if (__DEV__) {
      return normalizeBaseUrl(configuredBaseUrl);
    }

    throw error;
  }
};

const baseURL = resolveBaseUrl();

const QURAN_REMOTE_HOST_PATTERNS = [/api\.quran\.com$/i, /(^|\.)quran\.com$/i];
const QURAN_CONTENT_PATH_PATTERNS = [
  /(^|\/)quran(\/|$)/i,
  /(^|\/)surahs?(\/|$)/i,
  /(^|\/)ayahs?(\/|$)/i,
  /(^|\/)verses?(\/|$)/i,
  /(^|\/)juzs?(\/|$)/i,
];

type RequestConfigWithRetry = AxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
};

const refreshClient = axios.create({
  baseURL,
  timeout: 10_000,
});

let refreshPromise: Promise<{ accessToken: string; refreshToken: string; expiresAt: string } | null> | null = null;

const isQuranContentPath = (value: string) =>
  QURAN_CONTENT_PATH_PATTERNS.some((pattern) => pattern.test(value));

const assertNoRuntimeQuranNetworkRequest = (url: string | undefined, requestBaseUrl: string | undefined) => {
  if (!url) return;

  const candidate = String(url);
  const fallbackBase = requestBaseUrl ?? baseURL;
  let hostname = '';
  let pathname = candidate.split('?')[0];

  try {
    const parsed = new URL(candidate, fallbackBase);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
  } catch {
    // Keep candidate pathname when URL cannot be parsed.
  }

  const hitsQuranHost = QURAN_REMOTE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  const hitsQuranPath = isQuranContentPath(pathname);

  if (hitsQuranHost || hitsQuranPath) {
    throw new Error(
      'Runtime Quran network requests are blocked. Quran content must be loaded from local files under assets/content/quran.',
    );
  }
};

const buildRequestId = () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export class ApiClientError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = options?.code;
    this.status = options?.status;
  }
}

const sanitizeApiErrorMessage = (error: AxiosError<{ code?: string; message?: string }>) => {
  const status = error.response?.status;
  const apiMessage = error.response?.data?.message;

  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (status && status >= 500) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }

  return apiMessage ?? error.message ?? 'Network Error';
};

const refreshSessionTokens = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const currentTokens = await secureSession.getTokens();
    if (!currentTokens?.refreshToken) {
      await clearAccountScopedData();
      return null;
    }

    try {
      const { data } = await refreshClient.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; expiresAt: string };
      }>(
        '/auth/refresh',
        { refreshToken: currentTokens.refreshToken },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Request-Id': buildRequestId(),
          },
        },
      );

      await secureSession.saveTokens(data.data);
      return data.data;
    } catch {
      await clearAccountScopedData();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const apiClient = axios.create({
  baseURL,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  assertNoRuntimeQuranNetworkRequest(config.url, config.baseURL);
  config.headers = config.headers ?? {};
  config.headers['X-Request-Id'] = buildRequestId();
  config.headers['X-Noor-Client-Time'] = new Date().toISOString();

  const requestConfig = config as RequestConfigWithRetry;
  if (requestConfig._skipAuthRefresh) {
    return config;
  }

  const tokens = await secureSession.getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const originalConfig = (error.config ?? {}) as RequestConfigWithRetry;
    const requestUrl = originalConfig.url ?? '';
    const isAuthRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/google') ||
      requestUrl.includes('/auth/register');

    if (
      error.response?.status === 401 &&
      !originalConfig._retry &&
      !originalConfig._skipAuthRefresh &&
      !isAuthRoute
    ) {
      originalConfig._retry = true;

      const refreshedTokens = await refreshSessionTokens();
      if (refreshedTokens?.accessToken) {
        originalConfig.headers = originalConfig.headers ?? {};
        originalConfig.headers.Authorization = `Bearer ${refreshedTokens.accessToken}`;
        return apiClient(originalConfig);
      }
    }

    return Promise.reject(
      new ApiClientError(sanitizeApiErrorMessage(error), {
        code: error.response?.data?.code,
        status: error.response?.status,
      }),
    );
  },
);
