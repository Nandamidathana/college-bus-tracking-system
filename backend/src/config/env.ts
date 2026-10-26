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

  // Web Push VAPID Configuration
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || 'UU22Jy1KMqcQ1DYW6E2fQnU5xV9PkWp330k4X3B82xM',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@srgec.edu',

  // SMS & WhatsApp Provider Configuration
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'MOCK',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'MOCK',
  WHATSAPP_PHONE_NUMBER: process.env.WHATSAPP_PHONE_NUMBER || '',

  // Feature specific timeouts
  OCCUPANCY_STALE_MINUTES: 30,
  GUARDIAN_TOKEN_EXPIRY_HOURS: 24,
};
