import { useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { PrayerTimes } from '@/types/models';
import { AdhanVoiceId } from '@/types/models';
import { adhanAudioService } from '@/services/adhanAudioService';

const prayers: Array<keyof Pick<PrayerTimes, 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'>> = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

export const useAdhanPlayback = (prayerTimes: PrayerTimes | null, voiceId: AdhanVoiceId) => {
  const lastPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!prayerTimes) return;

    const check = () => {
      const now = dayjs();
      const nowTime = now.format('HH:mm');

      for (const prayer of prayers) {
        const prayerTime = prayerTimes[prayer];
        if (prayerTime !== nowTime) continue;

        const prayerKey = `${now.format('YYYY-MM-DD')}-${prayer}-${prayerTime}-${voiceId}`;
        if (lastPlayedRef.current === prayerKey) return;
        lastPlayedRef.current = prayerKey;
        void adhanAudioService.playPrayerAdhan(voiceId);
        return;
      }
    };

    check();
    const interval = setInterval(check, 15_000);

    return () => {
      clearInterval(interval);
      void adhanAudioService.stop();
    };
  }, [prayerTimes, voiceId]);
};
