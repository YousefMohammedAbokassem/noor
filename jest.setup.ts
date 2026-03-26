jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' },
  executionEnvironment: 'standalone',
  appOwnership: null,
}));
