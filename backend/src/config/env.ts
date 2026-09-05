import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'college_bus_live_tracker_super_secret_jwt_key_2026_xyz',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  STALE_TIMEOUT_MS: 30000, // 30 seconds of no GPS updates means location is stale
  PROXIMITY_THRESHOLD_METERS: 2000, // 2 km notification threshold
  MAX_VALID_SPEED_KMH: 140, // Any speed jump above 140 km/h is rejected as GPS anomaly
  MAX_VALID_ACCURACY_METERS: 2000, // Accepts GPS accuracy up to 2000m for indoor/desktop/Wi-Fi devices
};
