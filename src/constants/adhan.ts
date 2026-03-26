import { AdhanVoiceId } from '@/types/models';

export type AdhanVoiceOption = {
  id: AdhanVoiceId;
  labelAr: string;
  labelEn: string;
  source: number;
  notificationSound: string;
};

// Note: In Expo Go, custom notification sounds are not supported.
// The configured sound names are used in development/production builds.
export const adhanVoiceOptions: AdhanVoiceOption[] = [
  {
    id: 'abdul_basit',
    labelAr: 'عبد الباسط عبد الصمد',
    labelEn: 'Abdul Basit Abdus Samad',
    source: require('../../assets/audio/adhan/abdul_basit_adhan.mp3'),
    notificationSound: 'abdul_basit_adhan.mp3',
  },
  {
    id: 'haram_makki',
    labelAr: 'الحرم المكي',
    labelEn: 'Masjid al-Haram',
    source: require('../../assets/audio/adhan/haram_makki_adhan.mp3'),
    notificationSound: 'haram_makki_adhan.mp3',
  },
  {
    id: 'haram_nabawi',
    labelAr: 'الحرم النبوي',
    labelEn: 'Masjid an-Nabawi',
    source: require('../../assets/audio/adhan/haram_nabawi_adhan.mp3'),
    notificationSound: 'haram_nabawi_adhan.mp3',
  },
];

const legacyVoiceMap: Record<string, AdhanVoiceOption['id']> = {
  mishary: 'haram_makki',
  muaiqly: 'haram_nabawi',
};

export const normalizeAdhanVoiceId = (id: AdhanVoiceId | string): AdhanVoiceOption['id'] => {
  const normalized = legacyVoiceMap[id] ?? id;
  return adhanVoiceOptions.find((option) => option.id === normalized)?.id ?? adhanVoiceOptions[0].id;
};

export const getAdhanVoiceById = (id: AdhanVoiceId | string) =>
  adhanVoiceOptions.find((option) => option.id === normalizeAdhanVoiceId(id)) ?? adhanVoiceOptions[0];
