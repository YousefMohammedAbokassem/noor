# NOOR AL-HAYAH Mobile

React Native + Expo mobile application for iOS and Android.

## Requirements

- Node 20 or 22
- npm 10+
- Xcode for iOS builds
- Android Studio / Android SDK for Android builds

## Environment

Copy the example file first:

```bash
cp .env.example .env
```

Required variables:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_ENABLE_DEV_LOGS`

## Development

```bash
npm install
npm run start
```

Useful variants:

- `npm run start:lan`
- `npm run start:tunnel`
- `npm run start:go` for quick UI-only Expo Go sessions
- `npm run android`
- `npm run ios`

`npm run start` now starts Metro in dev-client mode by default so notification,
custom sound, and background behavior can be tested against a native build.

To generate a dev client:

```bash
npm run build:dev:android
npm run build:dev:ios
```

## Verification

```bash
npm run verify
```

This runs:

- TypeScript typecheck
- Jest test suite
- `expo-doctor`

## Build

- Development build Android: `npm run build:dev:android`
- Development build iOS: `npm run build:dev:ios`
- Preview APK: `npm run build:apk`
- Production AAB: `npm run build:aab`

## Delivery Notes

- For prayer notifications and adhan behavior, use a development build or production build on real devices.
- Expo Go is useful for UI iteration, but it is not the final validation path for notification/audio behavior in this app.
