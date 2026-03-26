const englishToArabicMap = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const arabicToEnglishMap = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const toArabicDigits = (value: string | number) =>
  value
    .toString()
    .replace(/[0-9]/g, (n) => englishToArabicMap[Number(n)] ?? n);

export const toEnglishDigits = (value: string | number) =>
  value
    .toString()
    .replace(/[٠-٩]/g, (n) => {
      const index = englishToArabicMap.indexOf(n);
      return index >= 0 ? arabicToEnglishMap[index] : n;
    });

export const formatNumber = (value: string | number, format: 'arabic' | 'english') =>
  format === 'arabic' ? toArabicDigits(value) : toEnglishDigits(value);
