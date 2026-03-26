import { Audio } from 'expo-av';
import { getAdhanVoiceById } from '@/constants/adhan';
import { AdhanVoiceId } from '@/types/models';

type PlaybackOptions = {
  durationMs?: number;
  onStop?: () => void;
};

let currentSound: Audio.Sound | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let currentOnStop: (() => void) | null = null;

const clearStopTimer = () => {
  if (!stopTimer) return;
  clearTimeout(stopTimer);
  stopTimer = null;
};

const stopCurrent = async () => {
  clearStopTimer();
  if (!currentSound) return;
  const sound = currentSound;
  const onStop = currentOnStop;
  currentSound = null;
  currentOnStop = null;
  try {
    await sound.stopAsync();
  } catch {
    // no-op
  }
  try {
    await sound.unloadAsync();
  } catch {
    // no-op
  }
  onStop?.();
};

const play = async (voiceId: AdhanVoiceId, options: PlaybackOptions = {}) => {
  const { durationMs = 12000, onStop } = options;
  const voice = getAdhanVoiceById(voiceId);

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    await stopCurrent();
    const result = await Audio.Sound.createAsync(voice.source, {
      shouldPlay: true,
      isLooping: false,
      volume: 1,
      progressUpdateIntervalMillis: 250,
    });
    currentSound = result.sound;
    currentOnStop = onStop ?? null;

    stopTimer = setTimeout(() => {
      void stopCurrent();
    }, durationMs);

    result.sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded || !status.didJustFinish) return;
      void stopCurrent();
    });

    return true;
  } catch {
    currentOnStop = null;
    await stopCurrent();
    return false;
  }
};

export const adhanAudioService = {
  playPreview: (voiceId: AdhanVoiceId, options: PlaybackOptions = {}) =>
    play(voiceId, { durationMs: 10000, ...options }),
  playPrayerAdhan: (voiceId: AdhanVoiceId, options: PlaybackOptions = {}) =>
    play(voiceId, { durationMs: 22000, ...options }),
  stop: stopCurrent,
};
