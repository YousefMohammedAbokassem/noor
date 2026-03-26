const loggingEnabled =
  process.env.NODE_ENV !== 'test' &&
  (process.env.EXPO_PUBLIC_ENABLE_DEV_LOGS === 'true' || __DEV__);

const serialize = (value: unknown) => {
  if (value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const write = (level: 'log' | 'warn' | 'error', scope: string, message: string, payload?: unknown) => {
  const line = `[${scope}] ${message}`;
  const serialized = serialize(payload);

  if (!loggingEnabled) {
    return;
  }

  if (serialized) {
    console[level](line, serialized);
    return;
  }

  console[level](line);
};

export const prayerLogger = {
  info: (message: string, payload?: unknown) => write('log', 'prayer', message, payload),
  warn: (message: string, payload?: unknown) => write('warn', 'prayer', message, payload),
  error: (message: string, payload?: unknown) => write('error', 'prayer', message, payload),
};
