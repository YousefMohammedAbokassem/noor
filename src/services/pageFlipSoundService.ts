import { Audio } from 'expo-av';

let pageSound: Audio.Sound | null = null;

const ensureSound = async () => {
  if (pageSound) return pageSound;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const soundResult = await Audio.Sound.createAsync(require('../../assets/audio/page-flip.aiff'), {
    shouldPlay: false,
    volume: 0.5,
  });
  pageSound = soundResult.sound;
  return pageSound;
};

export const pageFlipSoundService = {
  play: async () => {
    try {
      const sound = await ensureSound();
      await sound.setPositionAsync(0);
      await sound.playAsync();
      return true;
    } catch {
      return false;
    }
  },
  release: async () => {
    if (!pageSound) return;
    const sound = pageSound;
    pageSound = null;
    try {
      await sound.unloadAsync();
    } catch {
      // ignore
    }
  },
};
