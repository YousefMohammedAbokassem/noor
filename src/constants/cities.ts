import { PrayerCalculationMethod } from '@/types/models';

type SupportedCity = {
  id: string;
  cityAr: string;
  cityEn: string;
  countryAr: string;
  countryEn: string;
  countryCode: string;
  timeZone: string;
  lat: number;
  lng: number;
  calculationMethod?: PrayerCalculationMethod;
  asrMethod?: 'shafi' | 'hanafi';
};

export const supportedCities: SupportedCity[] = [
  {
    id: 'damascus',
    cityAr: 'دمشق',
    cityEn: 'Damascus',
    countryAr: 'سوريا',
    countryEn: 'Syria',
    countryCode: 'SY',
    timeZone: 'Asia/Damascus',
    lat: 33.5138,
    lng: 36.2765,
    calculationMethod: 'egyptian',
    asrMethod: 'shafi',
  },
  {
    id: 'riyadh',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    countryAr: 'السعودية',
    countryEn: 'Saudi Arabia',
    countryCode: 'SA',
    timeZone: 'Asia/Riyadh',
    lat: 24.7136,
    lng: 46.6753,
  },
  {
    id: 'mecca',
    cityAr: 'مكة',
    cityEn: 'Makkah',
    countryAr: 'السعودية',
    countryEn: 'Saudi Arabia',
    countryCode: 'SA',
    timeZone: 'Asia/Riyadh',
    lat: 21.3891,
    lng: 39.8579,
  },
  {
    id: 'cairo',
    cityAr: 'القاهرة',
    cityEn: 'Cairo',
    countryAr: 'مصر',
    countryEn: 'Egypt',
    countryCode: 'EG',
    timeZone: 'Africa/Cairo',
    lat: 30.0444,
    lng: 31.2357,
  },
  {
    id: 'istanbul',
    cityAr: 'إسطنبول',
    cityEn: 'Istanbul',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    countryCode: 'TR',
    timeZone: 'Europe/Istanbul',
    lat: 41.0082,
    lng: 28.9784,
  },
  {
    id: 'amman',
    cityAr: 'عمان',
    cityEn: 'Amman',
    countryAr: 'الأردن',
    countryEn: 'Jordan',
    countryCode: 'JO',
    timeZone: 'Asia/Amman',
    lat: 31.9539,
    lng: 35.9106,
  },
];
