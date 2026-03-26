import 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { LogBox } from 'react-native';
import { AppRoot } from './src/AppRoot';

const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

if (isExpoGo) {
  LogBox.ignoreLogs([
    'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
    '`expo-notifications` functionality is not fully supported in Expo Go:',
  ]);
}

export default function App() {
  return <AppRoot />;
}
