import * as Location from 'expo-location';
import { getDeviceTimeZone } from '@/services/prayer/dateTime';

const roundCoordinate = (value: number) => Math.round(value * 10_000) / 10_000;

type PrayerLocationSnapshot = {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  countryCode?: string;
  timeZone: string;
  locationLabel?: string;
  locationUpdatedAt: string;
  locationSource: 'gps';
};

const toPrayerLocationSnapshot = async (position: Location.LocationObject): Promise<PrayerLocationSnapshot> => {
  let city: string | undefined;
  let country: string | undefined;
  let countryCode: string | undefined;

  try {
    const place = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    city = place[0]?.city ?? place[0]?.subregion ?? undefined;
    country = place[0]?.country ?? undefined;
    countryCode = place[0]?.isoCountryCode ?? undefined;
  } catch {
    // Reverse geocoding is best effort and should never block core prayer functionality.
  }

  const locationLabel = city ?? country;

  return {
    latitude: roundCoordinate(position.coords.latitude),
    longitude: roundCoordinate(position.coords.longitude),
    city,
    country,
    countryCode,
    timeZone: getDeviceTimeZone(),
    locationLabel,
    locationUpdatedAt: new Date().toISOString(),
    locationSource: 'gps',
  };
};

export const locationService = {
  getPermissionStatus: async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  },
  requestPermission: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },
  getCurrentLocation: async (options?: { preferCached?: boolean }) => {
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: options?.preferCached ? Location.Accuracy.Balanced : Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });
    } catch {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: options?.preferCached ? 60 * 60 * 1000 : 60_000,
        requiredAccuracy: 1000,
      });
      if (!lastKnown) {
        throw new Error('location_unavailable');
      }
      return lastKnown;
    }
  },
  reverseGeocode: async (lat: number, lng: number) => {
    const data = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    return data[0];
  },
  getCurrentTimeZone: () => getDeviceTimeZone(),
  resolveAutoPrayerLocation: async () => {
    const position = await locationService.getCurrentLocation();
    return toPrayerLocationSnapshot(position);
  },
  watchHeading: async (onUpdate: (heading: number) => void) => {
    return Location.watchHeadingAsync((data) => {
      const heading = data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
      onUpdate(heading);
    });
  },
};
