import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { PrayerName, PrayerTimes } from '@/types/models';

const prayers: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const usePrayerCountdown = (times: PrayerTimes | null) => {
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    if (!times) return { nextName: null, nextTime: null, remaining: null };

    for (const key of prayers) {
      const value = times[key];
      if (typeof value !== 'string') continue;
      const target = times.timestampByPrayer?.[key]
        ? dayjs(times.timestampByPrayer[key])
        : dayjs(`${times.date} ${value}`);
      if (target.isAfter(now)) {
        const diffSec = Math.max(target.diff(now, 'second'), 0);
        const hours = Math.floor(diffSec / 3600)
          .toString()
          .padStart(2, '0');
        const mins = Math.floor((diffSec % 3600) / 60)
          .toString()
          .padStart(2, '0');
        const secs = (diffSec % 60).toString().padStart(2, '0');
        return { nextName: key, nextTime: value, remaining: `${hours}:${mins}:${secs}` };
      }
    }

    const fajrTarget = times.timestampByPrayer?.fajr
      ? dayjs(times.timestampByPrayer.fajr).add(1, 'day')
      : dayjs(`${times.date} ${times.fajr}`).add(1, 'day');
    const diffSec = Math.max(fajrTarget.diff(now, 'second'), 0);
    const hours = Math.floor(diffSec / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((diffSec % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = (diffSec % 60).toString().padStart(2, '0');

    return { nextName: 'fajr', nextTime: times.fajr, remaining: `${hours}:${mins}:${secs}` };
  }, [now, times]);
};
