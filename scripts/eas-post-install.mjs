import { rmSync } from 'node:fs';
import { join } from 'node:path';

const isSlimAndroidApk =
  process.env.NOOR_SLIM_ANDROID_APK === '1' ||
  (process.env.EAS_BUILD_PLATFORM === 'android' && process.env.EAS_BUILD_PROFILE === 'preview');

if (!isSlimAndroidApk) {
  process.exit(0);
}

const packagesToRemove = [
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'expo-dev-menu-interface',
];

for (const packageName of packagesToRemove) {
  rmSync(join(process.cwd(), 'node_modules', packageName), {
    force: true,
    recursive: true,
  });
}
