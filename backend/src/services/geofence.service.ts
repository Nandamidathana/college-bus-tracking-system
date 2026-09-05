import { Server } from 'socket.io';
import { prisma } from '../config/prisma';
import { calculateDistanceMeters, formatDistance, estimateTravelTimeMinutes } from '../utils/haversine';

export interface GeofenceCheckResult {
  hasArrived: boolean;
  distanceToDestinationMeters: number;
  formattedDistance: string;
  status?: 'ON_TIME' | 'DELAYED' | 'COMPLETED';
  delayMinutes?: number;
  arrivalRecord?: any;
  tripType?: string;
  destinationName?: string | null;
}

/**
 * Returns the current date in YYYY-MM-DD format (IST timezone UTC+5:30)
 */
export function getISTDateString(date: Date = new Date()): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
}

/**
 * Parses reporting time (e.g., "09:00" or "09:00 AM") and returns cutoff Date object for the given date
 */
export function getCutoffDateTime(date: Date, reportingTimeStr: string = '09:00'): Date {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffset);

  let [hoursStr, minutesStr] = reportingTimeStr.trim().split(':');
  let hours = parseInt(hoursStr, 10) || 9;
  let minutes = 0;
  if (minutesStr) {
    const minPart = minutesStr.split(' ')[0];
    minutes = parseInt(minPart, 10) || 0;
    if (reportingTimeStr.toUpperCase().includes('PM') && hours < 12) {
      hours += 12;
    } else if (reportingTimeStr.toUpperCase().includes('AM') && hours === 12) {
      hours = 0;
    }
  }

  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();

  const cutoffUtcMs = Date.UTC(year, month, day, hours, minutes, 0, 0) - istOffset;
  return new Date(cutoffUtcMs);
}

/**
 * Evaluates bus GPS location against the dynamic trip destination geofence.
 * 1. Morning Trip (MORNING_PICKUP): Destination is College Gate.
 *    - Arrival <= 100m records arrival time, delay/on-time status, BusArrival entry, and completes trip.
 * 2. Return Trip (EVENING_RETURN): Destination is the Final Village Stop / Depot Terminus.
 *    - Arrival <= 100m completes the return route, notifies students, and completes trip.
 */
export async function checkCollegeGateGeofence(
  io: Server,
  tripId: string,
  busId: string,
  latitude: number,
  longitude: number,
  speed: number = 0,
  heading: number = 0
): Promise<GeofenceCheckResult> {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: {
          include: {
            route: {
              include: {
                boardingPoints: { orderBy: { sequence: 'asc' } },
              },
            },
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
        college: true,
      },
    });

    if (!trip || trip.status !== 'ACTIVE' || trip.arrivalTime) {
      return {
        hasArrived: !!trip?.arrivalTime,
        distanceToDestinationMeters: 0,
        formattedDistance: '0 m',
      };
    }

    const college = trip.college;
    const isReturnTrip = trip.tripType === 'EVENING_RETURN';
    const geofenceRadius = college.geofenceRadius || 100.0;
    const now = new Date();

    // Determine target destination coordinates & name
    let destLat = trip.destinationLat;
    let destLng = trip.destinationLng;
    let destName = trip.destinationName;

    if (!destLat || !destLng || (isReturnTrip && destLat === college.latitude && destLng === college.longitude)) {
      if (isReturnTrip) {
        // Find last village stop in route sequence
        const stops = trip.bus.route?.boardingPoints || [];
        const villageStops = stops.filter((s: any) =>
          !s.name.toLowerCase().includes('college') &&
          !s.name.toLowerCase().includes('campus') &&
          !s.name.toLowerCase().includes('gate')
        );
        const lastStop = villageStops.length > 0
          ? villageStops[villageStops.length - 1]
          : (stops.length > 0 ? stops[stops.length - 1] : null);

        destLat = lastStop ? lastStop.latitude : 16.431025;
        destLng = lastStop ? lastStop.longitude : 80.997348;
        destName = lastStop ? `${lastStop.name} (Terminus)` : 'Gudivada Bus Stand (Terminus)';
      } else {
        // Morning trip destination is College Campus Gate
        destLat = college.latitude || 16.35068;
        destLng = college.longitude || 81.04273;
        destName = college.name ? `${college.name} Gate` : 'College Gate';
      }
    }

    const distanceMeters = calculateDistanceMeters(latitude, longitude, destLat, destLng);
    const formattedDistance = formatDistance(distanceMeters);

    // =========================================================================
    // 1. MORNING TRIP ARRIVAL AT COLLEGE GATE
    // =========================================================================
    if (!isReturnTrip) {
      const reportingTime = college.reportingTime || '09:00';
      const cutoffDate = getCutoffDateTime(now, reportingTime);

      // Check if bus reached College Gate (<= geofence radius)
      if (distanceMeters <= geofenceRadius) {
        const isDelayed = now.getTime() > cutoffDate.getTime();
        const delayMinutes = isDelayed
          ? Math.max(1, Math.round((now.getTime() - cutoffDate.getTime()) / (60 * 1000)))
          : 0;
        const status: 'ON_TIME' | 'DELAYED' = isDelayed ? 'DELAYED' : 'ON_TIME';
        const dateStr = getISTDateString(now);

        // Create or update BusArrival entry for admin audit & attendance
        const arrival = await prisma.busArrival.upsert({
          where: { tripId: trip.id },
          create: {
            tripId: trip.id,
            busId: trip.busId,
            driverId: trip.driverId,
            collegeId: college.id,
            routeId: trip.bus.routeId,
            date: dateStr,
            arrivalTime: now,
            reportingTime: reportingTime,
            status: status,
            delayMinutes: delayMinutes,
            distanceAtArrival: distanceMeters,
          },
          update: {
            arrivalTime: now,
            status: status,
            delayMinutes: delayMinutes,
            distanceAtArrival: distanceMeters,
          },
        });

        // Mark Trip as COMPLETED
        await prisma.trip.update({
          where: { id: trip.id },
          data: {
            status: 'COMPLETED',
            endTime: now,
            arrivalTime: now,
            arrivalStatus: status,
            delayMinutes: delayMinutes,
          },
        });

        // Set Driver status back to AVAILABLE
        await prisma.driver.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' },
        });

        // Set Bus status back to INACTIVE
        await prisma.bus.update({
          where: { id: trip.busId },
          data: { status: 'INACTIVE' },
        });

        const arrivalPayload = {
          type: 'BUS_ARRIVED',
          tripType: 'MORNING_PICKUP',
          tripId: trip.id,
          busId: trip.busId,
          busNumber: trip.bus.busNumber,
          routeName: trip.bus.route?.name || 'General Route',
          routeNumber: trip.bus.route?.routeNumber || 'N/A',
          driverName: trip.driver.driverName,
          driverPhone: trip.driver.phone || trip.driver.user.phone || 'N/A',
          arrivalTime: now.toISOString(),
          reportingTime: reportingTime,
          status: status,
          delayMinutes: delayMinutes,
          distanceAtArrival: distanceMeters,
          destinationName: destName,
          message:
            status === 'ON_TIME'
              ? `✅ Bus ${trip.bus.busNumber} arrived at College Gate ON TIME at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}.`
              : `🚨 Bus ${trip.bus.busNumber} arrived DELAYED by ${delayMinutes} mins at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} (Cutoff: ${reportingTime} AM).`,
        };

        io.to(`college_${college.id}`).emit('bus:arrived', arrivalPayload);
        io.to(`bus_${trip.busId}`).emit('bus:arrived', arrivalPayload);

        if (status === 'DELAYED') {
          io.to(`college_${college.id}`).emit('admin:bus:delayed', {
            ...arrivalPayload,
            isEnroute: false,
            latitude,
            longitude,
          });
        }

        return {
          hasArrived: true,
          distanceToDestinationMeters: distanceMeters,
          formattedDistance,
          status,
          delayMinutes,
          arrivalRecord: arrival,
          tripType: 'MORNING_PICKUP',
          destinationName: destName,
        };
      }

      // Check if running late past 9:00 AM while still en route
      if (now.getTime() > cutoffDate.getTime() && !trip.isDelayedNotified) {
        const delayMinutes = Math.max(1, Math.round((now.getTime() - cutoffDate.getTime()) / (60 * 1000)));
        const etaMinutes = estimateTravelTimeMinutes(distanceMeters);

        await prisma.trip.update({
          where: { id: trip.id },
          data: {
            isDelayedNotified: true,
            arrivalStatus: 'DELAYED',
            delayMinutes: delayMinutes,
          },
        });

        io.to(`college_${college.id}`).emit('admin:bus:delayed', {
          type: 'BUS_DELAYED_ENROUTE',
          tripType: 'MORNING_PICKUP',
          tripId: trip.id,
          busId: trip.busId,
          busNumber: trip.bus.busNumber,
          routeName: trip.bus.route?.name || 'General Route',
          routeNumber: trip.bus.route?.routeNumber || 'N/A',
          driverName: trip.driver.driverName,
          driverPhone: trip.driver.phone || trip.driver.user.phone || 'N/A',
          delayMinutes: delayMinutes,
          distanceToGateMeters: Math.round(distanceMeters),
          formattedDistance,
          etaMinutes,
          latitude,
          longitude,
          speed,
          heading,
          reportingTime,
          message: `🚨 Bus ${trip.bus.busNumber} is running late (${delayMinutes} min delay)! Currently ${formattedDistance} from college gate (ETA: ~${etaMinutes} mins).`,
        });
      }
    }

    // =========================================================================
    // 2. EVENING RETURN TRIP ARRIVAL AT FINAL VILLAGE TERMINUS / DEPOT
    // =========================================================================
    if (isReturnTrip) {
      if (distanceMeters <= geofenceRadius) {
        // Mark Return Trip as COMPLETED
        await prisma.trip.update({
          where: { id: trip.id },
          data: {
            status: 'COMPLETED',
            endTime: now,
            arrivalTime: now,
            arrivalStatus: 'COMPLETED',
          },
        });

        // Set Driver status back to AVAILABLE
        await prisma.driver.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' },
        });

        // Set Bus status back to INACTIVE
        await prisma.bus.update({
          where: { id: trip.busId },
          data: { status: 'INACTIVE' },
        });

        const returnPayload = {
          type: 'BUS_RETURN_COMPLETED',
          tripType: 'EVENING_RETURN',
          tripId: trip.id,
          busId: trip.busId,
          busNumber: trip.bus.busNumber,
          routeName: trip.bus.route?.name || 'Return Route',
          routeNumber: trip.bus.route?.routeNumber || 'N/A',
          driverName: trip.driver.driverName,
          completionTime: now.toISOString(),
          destinationName: destName,
          distanceAtArrival: distanceMeters,
          message: `🏁 Bus ${trip.bus.busNumber} has safely completed its evening return route at ${destName}.`,
        };

        io.to(`college_${college.id}`).emit('bus:return_completed', returnPayload);
        io.to(`bus_${trip.busId}`).emit('bus:return_completed', returnPayload);

        return {
          hasArrived: true,
          distanceToDestinationMeters: distanceMeters,
          formattedDistance,
          status: 'COMPLETED',
          tripType: 'EVENING_RETURN',
          destinationName: destName,
        };
      }
    }

    return {
      hasArrived: false,
      distanceToDestinationMeters: distanceMeters,
      formattedDistance,
      tripType: trip.tripType,
      destinationName: destName,
    };
  } catch (error) {
    console.error('Error in checkCollegeGateGeofence:', error);
    return {
      hasArrived: false,
      distanceToDestinationMeters: 0,
      formattedDistance: 'Error',
    };
  }
}
