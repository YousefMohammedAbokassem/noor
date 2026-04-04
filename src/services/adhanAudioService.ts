import { AudioPlayer, AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getAdhanVoiceById } from '@/constants/adhan';
import { AdhanVoiceId } from '@/types/models';

type PlaybackOptions = {
  durationMs?: number;
  onStop?: () => void;
  backgroundPlayback?: boolean;
  lockScreenTitle?: string;
};

let stopTimer: ReturnType<typeof setTimeout> | null = null;
let currentOnStop: (() => void) | null = null;
let currentPlayer: AudioPlayer | null = null;
let playbackSubscription: { remove: () => void } | null = null;

const buildLockScreenTitle = (lockScreenTitle?: string) => lockScreenTitle ?? 'Adhan';

const clearStopTimer = () => {
  if (!stopTimer) return;
  clearTimeout(stopTimer);
  stopTimer = null;
};

const clearPlaybackSubscription = () => {
  playbackSubscription?.remove();
  playbackSubscription = null;
};

const getPlayer = () => {
  if (!currentPlayer) {
    currentPlayer = createAudioPlayer(null, {
      updateInterval: 250,
      keepAudioSessionActive: true,
    });
  }

  return currentPlayer;
};

const stopPlayer = async () => {
  if (!currentPlayer) return;

  try {
    currentPlayer.pause();
  } catch {
    // no-op
  }

  try {
    await currentPlayer.seekTo(0);
  } catch {
    // no-op
  }

  try {
    currentPlayer.clearLockScreenControls();
  } catch {
    // no-op
  }
};

const stopCurrent = async () => {
  clearStopTimer();
  const onStop = currentOnStop;
  currentOnStop = null;
  await stopPlayer();
  onStop?.();
};

const bindPlaybackLifecycle = (player: AudioPlayer) => {
  clearPlaybackSubscription();
  playbackSubscription = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
    if (!status.didJustFinish) return;
    void stopCurrent();
  });
};

const play = async (voiceId: AdhanVoiceId, options: PlaybackOptions = {}) => {
  const { durationMs, onStop, backgroundPlayback = true, lockScreenTitle } = options;
  const voice = getAdhanVoiceById(voiceId);

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: backgroundPlayback,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });

    await stopCurrent();
    const player = getPlayer();
    bindPlaybackLifecycle(player);
    player.replace(voice.source);
    player.loop = false;
    player.volume = 1;
    currentOnStop = onStop ?? null;

    if (backgroundPlayback) {
      player.setActiveForLockScreen(true, {
        title: buildLockScreenTitle(lockScreenTitle),
        artist: voice.labelAr,
        albumTitle: 'Noor Al-Hayah',
      });
    } else {
      player.clearLockScreenControls();
    }

    player.play();

    if (typeof durationMs === 'number' && durationMs > 0) {
      stopTimer = setTimeout(() => {
        void stopCurrent();
      }, durationMs);
    }

    return true;
  } catch {
    currentOnStop = null;
    await stopCurrent();
    return false;
  }
};

export const adhanAudioService = {
  playPreview: (voiceId: AdhanVoiceId, options: PlaybackOptions = {}) =>
    play(voiceId, { durationMs: 10000, backgroundPlayback: false, ...options }),
  playPrayerAdhan: (voiceId: AdhanVoiceId, options: PlaybackOptions = {}) =>
    play(voiceId, { backgroundPlayback: true, ...options }),
  stop: stopCurrent,
};
