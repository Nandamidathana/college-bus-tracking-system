import { Server } from 'socket.io';
import { prisma } from '../config/prisma';
import { calculateDistanceMeters, formatDistance } from '../utils/haversine';
import { ENV } from '../config/env';
import { dispatchMultiChannelNotification } from './notification.service';

export interface ProximityCheckResult {
  studentId: string;
  studentName: string;
  boardingPointName: string;
  distanceMeters: number;
  formattedDistance: string;
  isNewAlert: boolean;
}

/**
 * Checks all students assigned to the bus or its route.
 * Emits proximity alerts when bus <= 2km (ENV.PROXIMITY_THRESHOLD_METERS) or <= 2 stops away.
 * Guarantees that only ONE notification is sent per student per active trip.
 */
export async function checkAndEmitProximityAlerts(
  io: Server,
  tripId: string,
  busId: string,
  busNumber: string,
  latitude: number,
  longitude: number
): Promise<ProximityCheckResult[]> {
  try {
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        route: {
          include: {
            boardingPoints: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
    });

    if (!bus) {
      return [];
    }

    // Find students on this route or college with boarding points
    const students = await prisma.student.findMany({
      where: {
        collegeId: bus.collegeId,
        ...(bus.routeId ? { routeId: bus.routeId } : {}),
      },
      include: {
        boardingPoint: true,
        preferences: true,
        user: { select: { name: true, phone: true } },
      },
    });

    if (!students.length) {
      return [];
    }

    const routeStops = bus.route?.boardingPoints || [];
    let currentStopSequence = -1;

    // Determine current bus location along the route stops
    if (routeStops.length > 0) {
      let minStopDist = Infinity;
      for (const stop of routeStops) {
        const d = calculateDistanceMeters(latitude, longitude, stop.latitude, stop.longitude);
        if (d < minStopDist) {
          minStopDist = d;
          currentStopSequence = stop.sequence;
        }
      }
    }

    const results: ProximityCheckResult[] = [];

    for (const student of students) {
      if (!student.boardingPoint) continue;

      const studentPref = student.preferences;
      // Default threshold preference is BOTH if not specified
      const thresholdType = studentPref?.thresholdType || 'BOTH';
      const arrivalAlertsEnabled = studentPref ? studentPref.busArrivalAlerts : true;

      if (!arrivalAlertsEnabled) {
        continue;
      }

      const distanceMeters = calculateDistanceMeters(
        latitude,
        longitude,
        student.boardingPoint.latitude,
        student.boardingPoint.longitude
      );

      const formattedDist = formatDistance(distanceMeters);
      const isWithin2Km = distanceMeters <= ENV.PROXIMITY_THRESHOLD_METERS;

      // Calculate stops away
      const studentStopSeq = student.boardingPoint.sequence;
      let isWithin2Stops = false;
      let stopsAway = -1;

      if (currentStopSequence >= 0 && studentStopSeq > currentStopSequence) {
        stopsAway = studentStopSeq - currentStopSequence;
        if (stopsAway <= 2 && stopsAway > 0) {
          isWithin2Stops = true;
        }
      }

      // Check condition based on threshold preference
      let triggered = false;
      let alertType: 'APPROACHING_2KM' | 'APPROACHING_2STOPS' = 'APPROACHING_2KM';
      let title = `🚌 Bus ${busNumber} Approaching`;
      let message = `Bus ${busNumber} is approx ${formattedDist} away from your stop (${student.boardingPoint.name}).`;

      if (thresholdType === 'DISTANCE_2KM') {
        if (isWithin2Km) {
          triggered = true;
          alertType = 'APPROACHING_2KM';
        }
      } else if (thresholdType === 'STOPS_2') {
        if (isWithin2Stops) {
          triggered = true;
          alertType = 'APPROACHING_2STOPS';
          message = `Bus ${busNumber} is ${stopsAway} stop${stopsAway > 1 ? 's' : ''} away from your stop (${student.boardingPoint.name}) [${formattedDist}].`;
        }
      } else {
        // BOTH
        if (isWithin2Km || isWithin2Stops) {
          triggered = true;
          if (isWithin2Stops && !isWithin2Km) {
            alertType = 'APPROACHING_2STOPS';
            message = `Bus ${busNumber} is ${stopsAway} stop${stopsAway > 1 ? 's' : ''} away from your stop (${student.boardingPoint.name}) [${formattedDist}].`;
          } else {
            alertType = 'APPROACHING_2KM';
          }
        }
      }

      if (triggered) {
        // Guarantee exactly one proximity alert per student per active trip
        const existingNotification = await prisma.notification.findFirst({
          where: {
            studentId: student.id,
            tripId: tripId,
            type: { in: ['APPROACHING_2KM', 'APPROACHING_2STOPS'] },
          },
        });

        if (!existingNotification) {
          // Multi-channel dispatch (In-App DB + Socket.IO + Web Push + SMS/WhatsApp)
          await dispatchMultiChannelNotification(io, {
            studentId: student.id,
            tripId,
            type: alertType,
            title,
            message,
            busId,
            busNumber,
            distanceKm: formattedDist,
          });

          // Legacy backwards-compatible event
          io.to(`student_${student.id}`).emit('bus:approaching', {
            type: alertType,
            tripId,
            busId,
            busNumber,
            boardingPointName: student.boardingPoint.name,
            distanceMeters: Math.round(distanceMeters),
            formattedDistance: formattedDist,
            message,
            timestamp: new Date().toISOString(),
          });

          results.push({
            studentId: student.id,
            studentName: student.user.name,
            boardingPointName: student.boardingPoint.name,
            distanceMeters,
            formattedDistance: formattedDist,
            isNewAlert: true,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error in checkAndEmitProximityAlerts:', error);
    return [];
  }
}
