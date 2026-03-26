const strictClockTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const easternArabicDigitMap: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

const pad = (value: number) => String(value).padStart(2, '0');

export const toWesternDigits = (value: string) =>
  value.replace(/[٠-٩۰-۹]/g, (digit) => easternArabicDigitMap[digit] ?? digit);

export const isClockTime = (value: string) => strictClockTimePattern.test(value);

export const normalizeClockTimeInput = (value: string) => {
  const sanitized = toWesternDigits(value).trim().replace(/\s+/g, '');
  if (strictClockTimePattern.test(sanitized)) {
    return sanitized;
  }

  const match = sanitized.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${pad(hour)}:${pad(minute)}`;
};

export const parseClockTime = (value: string) => {
  const normalized = normalizeClockTimeInput(value);
  if (!normalized) {
    return null;
  }

  const [hour, minute] = normalized.split(':').map(Number);
  return { hour, minute, normalized };
};

export const shiftClockTime = (value: string, deltaMinutes: number) => {
  const parsed = parseClockTime(value);
  if (!parsed) {
    return null;
  }

  const total = (parsed.hour * 60 + parsed.minute + deltaMinutes + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};
