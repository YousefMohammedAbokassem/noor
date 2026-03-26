import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'noor.rating.meta';

type RatingMeta = {
  launchCount: number;
  dismissed: boolean;
  lastPromptAt?: string;
};

const defaultMeta: RatingMeta = {
  launchCount: 0,
  dismissed: false,
};

export const useRatingPrompt = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const run = async () => {
      const raw = await AsyncStorage.getItem(KEY);
      const meta: RatingMeta = raw ? JSON.parse(raw) : defaultMeta;
      const next: RatingMeta = { ...meta, launchCount: meta.launchCount + 1 };

      const shouldShow = !next.dismissed && next.launchCount >= 6;
      if (shouldShow) {
        setVisible(true);
        next.lastPromptAt = new Date().toISOString();
      }
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    };

    void run();
  }, []);

  const dismiss = async (permanent = false) => {
    const raw = await AsyncStorage.getItem(KEY);
    const meta: RatingMeta = raw ? JSON.parse(raw) : defaultMeta;
    const next = { ...meta, dismissed: permanent || meta.dismissed };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    setVisible(false);
  };

  return { visible, dismiss };
};
