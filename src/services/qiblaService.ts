const KAABA = {
  lat: 21.4225,
  lng: 39.8262,
};

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const qiblaService = {
  getQiblaDirection: (latitude: number, longitude: number) => {
    const latRad = toRad(latitude);
    const kaabaLat = toRad(KAABA.lat);
    const dLng = toRad(KAABA.lng - longitude);

    const y = Math.sin(dLng);
    const x = Math.cos(latRad) * Math.tan(kaabaLat) - Math.sin(latRad) * Math.cos(dLng);
    const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;

    return Math.round(bearing);
  },
};
