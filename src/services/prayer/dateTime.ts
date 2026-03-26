const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  if (!dateFormatterCache.has(timeZone)) {
    dateFormatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-GB-u-ca-iso8601', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }

  return dateFormatterCache.get(timeZone)!;
};

const pad = (value: number) => String(value).padStart(2, '0');

export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export const getDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month, day };
};

export const formatDateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`;

export const addDaysToDateKey = (dateKey: string, days: number) => {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

export const compareDateKeys = (left: string, right: string) => left.localeCompare(right);

export const buildCalendarDate = (dateKey: string) => {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const getZonedDateParts = (date: Date, timeZone: string): ZonedDateParts => {
  try {
    const parts = getFormatter(timeZone).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
    };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }
};

export const getOffsetMinutes = (date: Date, timeZone: string) => {
  const zoned = getZonedDateParts(date, timeZone);
  const utcEquivalent = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );

  return Math.round((utcEquivalent - date.getTime()) / 60000);
};

export const getDateKeyInTimeZone = (date: Date, timeZone: string) => {
  const zoned = getZonedDateParts(date, timeZone);
  return formatDateKey(zoned.year, zoned.month, zoned.day);
};

export const formatTimeInTimeZone = (date: Date, timeZone: string) => {
  const zoned = getZonedDateParts(date, timeZone);
  return `${pad(zoned.hour)}:${pad(zoned.minute)}`;
};

export const combineDateAndTimeInZone = (dateKey: string, time: string, timeZone: string) => {
  const { year, month, day } = parseDateKey(dateKey);
  const [hour, minute] = time.split(':').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let nextGuess = targetUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offsetMinutes = getOffsetMinutes(new Date(nextGuess), timeZone);
    const adjusted = targetUtc - offsetMinutes * 60_000;
    if (adjusted === nextGuess) {
      break;
    }
    nextGuess = adjusted;
  }

  return new Date(nextGuess);
};
