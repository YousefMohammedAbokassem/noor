const { withAppBuildGradle } = require('expo/config-plugins');

const START_MARKER = '// @noor-arm64-apk-start';
const END_MARKER = '// @noor-arm64-apk-end';

const arm64SplitBlock = `    ${START_MARKER}
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a"
            universalApk false
        }
    }
    ${END_MARKER}`;

module.exports = function withAndroidArm64Apk(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      return mod;
    }

    if (mod.modResults.contents.includes(START_MARKER)) {
      return mod;
    }

    mod.modResults.contents = mod.modResults.contents.replace(
      /android\s*\{/,
      (match) => `${match}\n${arm64SplitBlock}`
    );

    return mod;
  });
};
