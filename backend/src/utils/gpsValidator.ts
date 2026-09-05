import { ENV } from '../config/env';
import { calculateDistanceMeters } from './haversine';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: number | string | Date;
}

export interface PreviousLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  cleanedLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
    heading: number;
    timestamp: Date;
  };
}

export function validateGpsUpdate(
  incoming: LocationPayload,
  previous?: PreviousLocation | null
): ValidationResult {
  const { latitude, longitude, accuracy = 5, speed = 0, heading = 0, timestamp } = incoming;

  // 1. Basic coordinate range checks
  if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
    return { isValid: false, reason: 'Invalid latitude value.' };
  }
  if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
    return { isValid: false, reason: 'Invalid longitude value.' };
  }

  // 2. Accuracy check
  if (accuracy > ENV.MAX_VALID_ACCURACY_METERS) {
    return {
      isValid: false,
      reason: `GPS accuracy too low (${accuracy}m > threshold ${ENV.MAX_VALID_ACCURACY_METERS}m). Update discarded to avoid jump.`,
    };
  }

  // 3. Timestamp resolution
  let parsedTimestamp: Date;
  if (!timestamp) {
    parsedTimestamp = new Date();
  } else if (typeof timestamp === 'number') {
    parsedTimestamp = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    parsedTimestamp = new Date(timestamp);
  } else {
    parsedTimestamp = timestamp;
  }

  if (isNaN(parsedTimestamp.getTime())) {
    parsedTimestamp = new Date();
  }

  // 4. Extreme jump / impossible speed check
  // Never discard a high-accuracy satellite fix (accuracy <= 50m) or updates after reconnection/startup
  if (previous && previous.timestamp) {
    const timeDeltaSeconds = Math.max(
      1,
      (parsedTimestamp.getTime() - new Date(previous.timestamp).getTime()) / 1000
    );

    // Only perform jump check if updates are within 30 seconds of each other
    if (timeDeltaSeconds < 30) {
      const distanceMeters = calculateDistanceMeters(
        previous.latitude,
        previous.longitude,
        latitude,
        longitude
      );

      const calculatedSpeedKmh = (distanceMeters / 1000) / (timeDeltaSeconds / 3600);

      // Only reject if speed is absurd (> 300 km/h) AND distance is large (> 500m) AND accuracy is poor (> 50m)
      if (calculatedSpeedKmh > 300 && distanceMeters > 500 && accuracy > 50) {
        return {
          isValid: false,
          reason: `Implausible GPS jump detected (${distanceMeters.toFixed(1)}m in ${timeDeltaSeconds.toFixed(1)}s = ${calculatedSpeedKmh.toFixed(1)} km/h with low accuracy ±${accuracy}m). Filtered out.`,
        };
      }
    }
  }

  return {
    isValid: true,
    cleanedLocation: {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      accuracy: Math.max(1, Number(accuracy.toFixed(1))),
      speed: Math.max(0, Number(speed.toFixed(1))),
      heading: Math.max(0, Number(heading.toFixed(1))),
      timestamp: parsedTimestamp,
    },
  };
}

