/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 (in degrees)
 * @param lon1 Longitude of point 1 (in degrees)
 * @param lat2 Latitude of point 2 (in degrees)
 * @param lon2 Longitude of point 2 (in degrees)
 * @returns Distance in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Formats distance in meters to a clean human-readable string.
 * Examples:
 * - 450 meters -> "450 m"
 * - 1850 meters -> "1.85 km"
 * - 4700 meters -> "4.7 km"
 * - 12300 meters -> "12.3 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(2)} km`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Rough estimated travel time based on average bus speed (e.g. 30 km/h in suburban/college route)
 */
export function estimateTravelTimeMinutes(meters: number, avgSpeedKmh = 30): number {
  if (meters <= 0) return 0;
  const km = meters / 1000;
  const hours = km / avgSpeedKmh;
  const minutes = Math.ceil(hours * 60);
  return minutes;
}
