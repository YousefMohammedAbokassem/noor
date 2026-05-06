const baseExpo = require('./app.json').expo;

const ANDROID_ADHAN_SOUNDS = [
  './assets/audio/adhan/abdul_basit_adhan.mp3',
  './assets/audio/adhan/haram_makki_adhan.mp3',
  './assets/audio/adhan/haram_nabawi_adhan.mp3',
];

const IOS_ADHAN_SOUNDS = [
  './assets/audio/adhan/abdul_basit_adhan_ios.caf',
  './assets/audio/adhan/haram_makki_adhan_ios.caf',
  './assets/audio/adhan/haram_nabawi_adhan_ios.caf',
];

const buildPlatform = process.env.EAS_BUILD_PLATFORM;
const buildProfile = process.env.EAS_BUILD_PROFILE;
const isProductionBuild =
  process.env.NODE_ENV === 'production' || buildProfile === 'preview' || buildProfile === 'production';
const isSlimAndroidApk =
  process.env.NOOR_SLIM_ANDROID_APK === '1' ||
  (buildPlatform === 'android' && buildProfile === 'preview');

const isExpoDevClientPlugin = (plugin) => plugin === 'expo-dev-client';
const isExpoNotificationsPlugin = (plugin) =>
  Array.isArray(plugin) && plugin[0] === 'expo-notifications';

const getNotificationSounds = () => {
  if (buildPlatform === 'android') return ANDROID_ADHAN_SOUNDS;
  if (buildPlatform === 'ios') return IOS_ADHAN_SOUNDS;
  return [...ANDROID_ADHAN_SOUNDS, ...IOS_ADHAN_SOUNDS];
};

const plugins = baseExpo.plugins
  .filter((plugin) => !isProductionBuild || !isExpoDevClientPlugin(plugin))
  .map((plugin) => {
    if (!isExpoNotificationsPlugin(plugin)) return plugin;

    return [
      plugin[0],
      {
        ...plugin[1],
        sounds: getNotificationSounds(),
      },
    ];
  });

if (isSlimAndroidApk) {
  plugins.push('./plugins/withAndroidArm64Apk');
}

module.exports = ({ config }) => ({
  ...config,
  ...baseExpo,
  extra: {
    ...baseExpo.extra,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  },
  plugins,
});
