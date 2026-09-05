import { Server } from 'socket.io';
import { prisma } from '../config/prisma';
import { calculateDistanceMeters, formatDistance } from '../utils/haversine';
import { ENV } from '../config/env';

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
 * Emits proximity alerts when bus <= 2km (ENV.PROXIMITY_THRESHOLD_METERS) from the boarding point.
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
        route: true,
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
        user: { select: { name: true } },
      },
    });

    if (!students.length) {
      return [];
    }

    const results: ProximityCheckResult[] = [];

    for (const student of students) {
      if (!student.boardingPoint) continue;

      const distanceMeters = calculateDistanceMeters(
        latitude,
        longitude,
        student.boardingPoint.latitude,
        student.boardingPoint.longitude
      );

      const formattedDist = formatDistance(distanceMeters);

      // Check if within 2 km threshold
      if (distanceMeters <= ENV.PROXIMITY_THRESHOLD_METERS) {
        // Check if notification already sent for this student in this trip
        const existingNotification = await prisma.notification.findUnique({
          where: {
            studentId_tripId_type: {
              studentId: student.id,
              tripId: tripId,
              type: 'APPROACHING_2KM',
            },
          },
        });

        if (!existingNotification) {
          const message = `🚌 Bus ${busNumber} is approximately ${formattedDist} away from your boarding point (${student.boardingPoint.name}).`;

          // Record in DB to guarantee exactly one notification per trip
          await prisma.notification.create({
            data: {
              studentId: student.id,
              tripId: tripId,
              type: 'APPROACHING_2KM',
              message,
              status: 'SENT',
            },
          });

          // Realtime emit directly to student's private room and bus room
          io.to(`student_${student.id}`).emit('bus:approaching', {
            type: 'APPROACHING_2KM',
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
