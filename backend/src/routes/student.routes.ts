import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { calculateDistanceMeters, formatDistance, estimateTravelTimeMinutes } from '../utils/haversine';
import { checkBusServesBoardingStop, extractDistinctiveTokens } from '../utils/routeMatching';
import { geocodeLocation } from '../services/geocoding.service';
import { ENV } from '../config/env';

const router = Router();

// Apply authentication and STUDENT role guard to all student routes
router.use(authenticate, requireRole(['STUDENT']));

// GET /api/student/profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        college: true,
        route: {
          include: {
            boardingPoints: { orderBy: { sequence: 'asc' } },
            buses: true,
          },
        },
        boardingPoint: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    return res.json({ success: true, student });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return res.status(500).json({ error: 'Failed to fetch student profile.' });
  }
});

// Helper: Finds the best matching route and stop for a student's boarding point or village
async function findMatchingRouteAndStop(
  collegeId: string,
  boardingPointName: string,
  lat?: number,
  lng?: number,
  preferredRouteId?: string
) {
  const routes = await prisma.route.findMany({
    where: { collegeId },
    include: {
      boardingPoints: { orderBy: { sequence: 'asc' } },
      buses: true,
    },
  });

  if (routes.length === 0) return { routeId: preferredRouteId || '', boardingPointId: '', boardingPoint: null };

  const cleanName = (boardingPointName || '').toLowerCase().trim();
  const tokens = extractDistinctiveTokens(cleanName);

  // 1. Direct Stop Name Match in any route of this college (e.g. "vuyyuru", "gudivada", "pedana", "chilakalapudi", "benz circle")
  for (const route of routes) {
    for (const stop of route.boardingPoints) {
      const stopClean = stop.name.toLowerCase().trim();
      const stopTokens = extractDistinctiveTokens(stopClean);

      // Skip college destination stops when matching student boarding points
      if (stopClean.includes('college') || stopClean.includes('srgec') || stopClean.includes('campus')) continue;

      if (stopClean === cleanName || (tokens.length > 0 && stopTokens.some((st) => tokens.includes(st) || cleanName.includes(st) || stopClean.includes(tokens[0])))) {
        return { routeId: route.id, boardingPointId: stop.id, boardingPoint: stop };
      }
    }
  }

  // 2. Route Name match (e.g. "vijayawada", "gudivada", "machilipatnam")
  for (const route of routes) {
    const routeTokens = extractDistinctiveTokens(route.name);
    if (tokens.some((t) => routeTokens.includes(t) || route.name.toLowerCase().includes(t))) {
      const stop = route.boardingPoints[0] || null;
      return { routeId: route.id, boardingPointId: stop ? stop.id : '', boardingPoint: stop };
    }
  }

  // 3. Proximity-based match if coordinates provided
  if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
    let closestRoute = routes[0];
    let closestStop = routes[0].boardingPoints[0] || null;
    let minDistance = Infinity;

    for (const route of routes) {
      for (const stop of route.boardingPoints) {
        if (stop.name.toLowerCase().includes('college') || stop.name.toLowerCase().includes('srgec') || stop.name.toLowerCase().includes('campus')) continue;
        const dist = calculateDistanceMeters(lat, lng, stop.latitude, stop.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closestRoute = route;
          closestStop = stop;
        }
      }
    }

    if (closestStop) {
      return { routeId: closestRoute.id, boardingPointId: closestStop.id, boardingPoint: closestStop };
    }
  }

  const selectedRoute = (preferredRouteId && routes.find((r) => r.id === preferredRouteId)) || routes[0];
  const selectedStop = selectedRoute.boardingPoints[0] || null;
  return { routeId: selectedRoute.id, boardingPointId: selectedStop ? selectedStop.id : '', boardingPoint: selectedStop };
}

// PUT /api/student/profile - Edit student profile details and boarding point
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const { name, village, routeId, boardingPointId, boardingPointName, latitude, longitude } = req.body;

    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      include: { user: true, boardingPoint: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // 1. Update user name if provided
    if (name) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { name: name.trim() },
      });
    }

    let finalLat = latitude !== undefined ? parseFloat(String(latitude)) : NaN;
    let finalLng = longitude !== undefined ? parseFloat(String(longitude)) : NaN;
    const targetBpName = boardingPointName ? boardingPointName.trim() : (village ? village.trim() : '');

    // Check if coords are dummy or missing
    const isDummyCoord = isNaN(finalLat) || isNaN(finalLng) || (finalLat === 16.35 && finalLng === 80.62) || (finalLat === 16.355 && finalLng === 80.625);

    if (isDummyCoord && targetBpName) {
      const geocoded = await geocodeLocation(targetBpName);
      if (geocoded) {
        finalLat = geocoded.latitude;
        finalLng = geocoded.longitude;
      }
    }

    // 2. Find the correct matching route and stop
    const match = await findMatchingRouteAndStop(student.collegeId, targetBpName || student.village, finalLat, finalLng, routeId);
    let finalRouteId = match.routeId || routeId || student.routeId;
    let finalBoardingPointId = match.boardingPointId || boardingPointId || student.boardingPointId;

    if (!finalBoardingPointId || finalBoardingPointId === 'CUSTOM') {
      if (!isNaN(finalLat) && !isNaN(finalLng)) {
        const newBp = await prisma.boardingPoint.create({
          data: {
            name: targetBpName || 'My Boarding Stop',
            latitude: finalLat,
            longitude: finalLng,
            routeId: finalRouteId,
            sequence: 99,
          },
        });
        finalBoardingPointId = newBp.id;
      }
    }

    // 3. Update student record
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        ...(village ? { village: village.trim() } : {}),
        routeId: finalRouteId,
        boardingPointId: finalBoardingPointId,
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        college: true,
        route: {
          include: {
            boardingPoints: { orderBy: { sequence: 'asc' } },
            buses: true,
          },
        },
        boardingPoint: true,
      },
    });

    return res.json({
      success: true,
      message: 'Profile and boarding point updated successfully.',
      student: updatedStudent,
    });
  } catch (error: any) {
    console.error('Error updating student profile:', error);
    return res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

// PUT /api/student/boarding-point - Quick update student boarding point to live GPS
router.put('/boarding-point', async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude } = req.body;
    let finalLat = latitude !== undefined ? parseFloat(String(latitude)) : NaN;
    let finalLng = longitude !== undefined ? parseFloat(String(longitude)) : NaN;

    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      include: { boardingPoint: true, route: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const bpName = name ? name.trim() : (student.boardingPoint?.name || '');

    if (isNaN(finalLat) || isNaN(finalLng) || (finalLat === 16.35 && finalLng === 80.62) || (finalLat === 16.355 && finalLng === 80.625)) {
      if (bpName) {
        const geocoded = await geocodeLocation(bpName);
        if (geocoded) {
          finalLat = geocoded.latitude;
          finalLng = geocoded.longitude;
        }
      }
    }

    if (isNaN(finalLat) || isNaN(finalLng)) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const match = await findMatchingRouteAndStop(student.collegeId, bpName, finalLat, finalLng, student.routeId);
    let finalRouteId = match.routeId || student.routeId;
    let bp;

    if (match.boardingPointId) {
      bp = await prisma.boardingPoint.findUnique({ where: { id: match.boardingPointId } });
      await prisma.student.update({
        where: { id: student.id },
        data: {
          boardingPointId: match.boardingPointId,
          routeId: finalRouteId,
        },
      });
    } else {
      bp = await prisma.boardingPoint.create({
        data: {
          name: bpName || 'My Live Location',
          latitude: finalLat,
          longitude: finalLng,
          routeId: finalRouteId,
          sequence: 99,
        },
      });
      await prisma.student.update({
        where: { id: student.id },
        data: {
          boardingPointId: bp.id,
          routeId: finalRouteId,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Boarding point updated to your live GPS coordinates.',
      boardingPoint: bp,
    });
  } catch (error: any) {
    console.error('Error updating boarding point:', error);
    return res.status(500).json({ error: 'Failed to update boarding point.' });
  }
});

// GET /api/student/buses - List all buses in student's college
router.get('/buses', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const buses = await prisma.bus.findMany({
      where: { collegeId },
      include: {
        route: {
          include: {
            boardingPoints: { orderBy: { sequence: 'asc' } },
          },
        },
        assignedDriver: { select: { driverName: true, phone: true } },
        liveLocation: true,
        trips: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
      orderBy: { busNumber: 'asc' },
    });

    const enrichedBuses = buses.map((bus) => {
      const activeTrip = bus.trips[0];
      const hasLiveLoc = bus.liveLocation !== null;
      let status = 'OFFLINE';

      if (activeTrip && hasLiveLoc) {
        status = bus.liveLocation!.isStale ? 'LOCATION_DELAYED' : 'LIVE';
      }

      return {
        id: bus.id,
        busNumber: bus.busNumber,
        capacity: bus.capacity,
        route: bus.route,
        driver: bus.assignedDriver,
        activeTrip: activeTrip || null,
        liveLocation: activeTrip ? bus.liveLocation : null,
        status,
      };
    });

    return res.json({ success: true, buses: enrichedBuses });
  } catch (error) {
    console.error('Error fetching student buses:', error);
    return res.status(500).json({ error: 'Failed to fetch buses.' });
  }
});

// GET /api/student/buses/:busId - Get single bus status and location
router.get('/buses/:busId', async (req: Request, res: Response) => {
  try {
    const { busId } = req.params;
    const collegeId = req.user!.collegeId;

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        route: {
          include: {
            boardingPoints: { orderBy: { sequence: 'asc' } },
          },
        },
        assignedDriver: { select: { driverName: true, phone: true } },
        liveLocation: true,
        trips: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!bus) {
      return res.status(404).json({ error: 'Bus not found.' });
    }

    // Enforce multi-college isolation
    if (bus.collegeId !== collegeId) {
      return res.status(403).json({ error: 'Access denied: Bus does not belong to your college.' });
    }

    const activeTrip = bus.trips[0] || null;

    return res.json({
      success: true,
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        route: bus.route,
        driver: bus.assignedDriver,
        activeTrip,
        liveLocation: activeTrip ? bus.liveLocation : null,
        status: activeTrip ? (bus.liveLocation?.isStale ? 'LOCATION_DELAYED' : 'LIVE') : 'OFFLINE',
      },
    });
  } catch (error) {
    console.error('Error fetching bus details:', error);
    return res.status(500).json({ error: 'Failed to fetch bus.' });
  }
});

// GET /api/student/buses/:busId/location - Live location with distance to student boarding point
router.get('/buses/:busId/location', async (req: Request, res: Response) => {
  try {
    const { busId } = req.params;
    const collegeId = req.user!.collegeId;

    // Retrieve student and their boarding point
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      include: {
        boardingPoint: true,
        college: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        liveLocation: true,
        route: {
          include: {
            boardingPoints: { orderBy: { sequence: 'asc' } },
          },
        },
        assignedDriver: { select: { driverName: true, phone: true } },
        trips: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!bus || bus.collegeId !== collegeId) {
      return res.status(404).json({ error: 'Bus not found in your college.' });
    }

    const activeTrip = bus.trips[0];
    if (!activeTrip || !bus.liveLocation) {
      return res.json({
        success: true,
        active: false,
        status: 'OFFLINE',
        message: `Bus ${bus.busNumber} is currently not on an active trip.`,
        busNumber: bus.busNumber,
        boardingPoint: student.boardingPoint
          ? {
              name: student.boardingPoint.name,
              latitude: student.boardingPoint.latitude,
              longitude: student.boardingPoint.longitude,
            }
          : null,
        college: student.college
          ? {
              name: student.college.name,
              latitude: student.college.latitude,
              longitude: student.college.longitude,
            }
          : null,
      });
    }

    const live = bus.liveLocation;
    const isReturnTrip = activeTrip.tripType === 'EVENING_RETURN';

    // 1. Strict Stop & Route Matching Validation
    const isBusServingStudentStop = checkBusServesBoardingStop(
      bus,
      student.boardingPoint,
      student.routeId
    );

    // Distance & ETA to Student's designated stop (Only if bus route actually passes student stop)
    let distanceToStudentMeters: number | null = null;
    let formattedDistanceToStudent = '❌ No Route';
    let etaMinutesToStudent: number | null = null;

    if (isBusServingStudentStop && student.boardingPoint) {
      const dist = calculateDistanceMeters(
        live.latitude,
        live.longitude,
        student.boardingPoint.latitude,
        student.boardingPoint.longitude
      );
      distanceToStudentMeters = Math.round(dist);
      formattedDistanceToStudent = formatDistance(dist);
      etaMinutesToStudent = estimateTravelTimeMinutes(dist);
    }

    // 2. Distance & ETA to Trip Destination (College Gate vs Final Village Stop)
    const stops = bus.route?.boardingPoints || [];
    let destLat = activeTrip.destinationLat;
    let destLng = activeTrip.destinationLng;
    let destName = activeTrip.destinationName;

    if (isReturnTrip && (!destLat || destLat === (student.college?.latitude || 16.35068))) {
      const villageStops = stops.filter((s: any) =>
        !s.name.toLowerCase().includes('college') &&
        !s.name.toLowerCase().includes('campus') &&
        !s.name.toLowerCase().includes('gate')
      );
      const lastStop = villageStops.length > 0 ? villageStops[villageStops.length - 1] : (stops.length > 0 ? stops[stops.length - 1] : null);
      if (lastStop) {
        destLat = lastStop.latitude;
        destLng = lastStop.longitude;
        destName = `${lastStop.name} (Terminus)`;
      } else {
        destLat = 16.431025;
        destLng = 80.997348;
        destName = 'Gudivada Bus Stand (Terminus)';
      }
    } else if (!isReturnTrip && !destLat) {
      destLat = student.college?.latitude || 16.35068;
      destLng = student.college?.longitude || 81.04273;
      destName = student.college?.name ? `${student.college.name} Gate` : 'SRGEC College Gate';
    }

    const distanceToDestMeters = calculateDistanceMeters(live.latitude, live.longitude, destLat!, destLng!);
    const formattedDistanceToDest = formatDistance(distanceToDestMeters);
    const etaMinutesToDest = estimateTravelTimeMinutes(distanceToDestMeters);

    // 3. Determine next stop along route
    let nextStopName = destName;
    if (stops.length > 0) {
      // Find closest upcoming stop with sequence order
      const orderedStops = isReturnTrip ? [...stops].reverse() : stops;
      let minStopDist = Infinity;
      let closestStop = orderedStops[0];

      for (const stop of orderedStops) {
        const d = calculateDistanceMeters(live.latitude, live.longitude, stop.latitude, stop.longitude);
        if (d < minStopDist) {
          minStopDist = d;
          closestStop = stop;
        }
      }
      nextStopName = closestStop.name;
    }

    let status = 'LIVE';
    if (live.isStale) {
      status = 'LOCATION_DELAYED';
    } else if (isBusServingStudentStop && distanceToStudentMeters !== null) {
      if (distanceToStudentMeters <= 500) {
        status = 'NEARBY';
      } else if (distanceToStudentMeters <= ENV.PROXIMITY_THRESHOLD_METERS) {
        status = 'APPROACHING';
      }
    }

    return res.json({
      success: true,
      active: true,
      status,
      busId: bus.id,
      busNumber: bus.busNumber,
      tripId: activeTrip.id,
      tripType: activeTrip.tripType,
      originName: activeTrip.originName || (isReturnTrip ? 'SRGEC Campus' : 'Start Depot'),
      destinationName: destName,
      destinationLat: destLat,
      destinationLng: destLng,
      nextStopName,
      driverName: bus.assignedDriver?.driverName || 'Assigned Driver',
      driverPhone: bus.assignedDriver?.phone || null,
      location: {
        latitude: live.latitude,
        longitude: live.longitude,
        accuracy: live.accuracy,
        speed: live.speed,
        heading: live.heading,
        timestamp: live.timestamp,
        isStale: live.isStale,
      },
      isServingStudent: isBusServingStudentStop,
      boardingPoint: isBusServingStudentStop && student.boardingPoint
        ? {
            name: student.boardingPoint.name,
            latitude: student.boardingPoint.latitude,
            longitude: student.boardingPoint.longitude,
          }
        : null,
      college: student.college
        ? {
            name: student.college.name,
            latitude: student.college.latitude,
            longitude: student.college.longitude,
          }
        : null,
      distance: {
        meters: distanceToStudentMeters,
        formatted: formattedDistanceToStudent,
        estimatedMinutes: etaMinutesToStudent,
        isServingStudent: isBusServingStudentStop,
      },
      destinationDistance: {
        meters: Math.round(distanceToDestMeters),
        formatted: formattedDistanceToDest,
        estimatedMinutes: etaMinutesToDest,
      },
    });
  } catch (error) {
    console.error('Error fetching bus live location:', error);
    return res.status(500).json({ error: 'Failed to compute live bus location.' });
  }
});

// GET /api/student/notifications - Fetch 2km proximity notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const notifications = await prisma.notification.findMany({
      where: { studentId: student.id },
      orderBy: { sentAt: 'desc' },
      take: 20,
    });

    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching student notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// GET /api/student/preferences - Fetch student notification preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      include: { preferences: true, user: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    let pref = student.preferences;
    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          studentId: student.id,
          busArrivalAlerts: true,
          thresholdType: 'BOTH',
          enableWebPush: true,
          enableSms: false,
          enableWhatsApp: false,
          phoneNumber: student.user.phone || null,
        },
      });
    }

    return res.json({ success: true, preferences: pref });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return res.status(500).json({ error: 'Failed to fetch preferences.' });
  }
});

// POST /api/student/preferences - Update notification preferences
router.post('/preferences', async (req: Request, res: Response) => {
  try {
    const { busArrivalAlerts, thresholdType, enableWebPush, enableSms, enableWhatsApp, phoneNumber } = req.body;
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const pref = await prisma.notificationPreference.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        busArrivalAlerts: busArrivalAlerts ?? true,
        thresholdType: thresholdType || 'BOTH',
        enableWebPush: enableWebPush ?? true,
        enableSms: enableSms ?? false,
        enableWhatsApp: enableWhatsApp ?? false,
        phoneNumber: phoneNumber || null,
      },
      update: {
        ...(busArrivalAlerts !== undefined ? { busArrivalAlerts } : {}),
        ...(thresholdType ? { thresholdType } : {}),
        ...(enableWebPush !== undefined ? { enableWebPush } : {}),
        ...(enableSms !== undefined ? { enableSms } : {}),
        ...(enableWhatsApp !== undefined ? { enableWhatsApp } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber } : {}),
      },
    });

    return res.json({ success: true, message: 'Preferences updated successfully.', preferences: pref });
  } catch (error: any) {
    console.error('Error saving preferences:', error);
    return res.status(500).json({ error: 'Failed to save preferences.' });
  }
});

// POST /api/student/push-subscribe - Register Web Push subscription
router.post('/push-subscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription payload.' });
    }

    const sub = await prisma.pushSubscriptionRecord.upsert({
      where: { endpoint },
      create: {
        userId: req.user!.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || null,
      },
      update: {
        userId: req.user!.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || null,
      },
    });

    return res.json({ success: true, message: 'Push subscription registered.', subscription: sub });
  } catch (error: any) {
    console.error('Error registering push subscription:', error);
    return res.status(500).json({ error: 'Failed to register push subscription.' });
  }
});

// POST /api/student/push-unsubscribe - Remove Web Push subscription
router.post('/push-unsubscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await prisma.pushSubscriptionRecord.deleteMany({
        where: { endpoint },
      });
    }
    return res.json({ success: true, message: 'Push subscription removed.' });
  } catch (error: any) {
    console.error('Error removing push subscription:', error);
    return res.status(500).json({ error: 'Failed to remove push subscription.' });
  }
});

// POST /api/student/trips/:tripId/board - Student boarding confirmation ("I'm on board")
router.post('/trips/:tripId/board', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { bus: true },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    const confirmation = await prisma.boardingConfirmation.upsert({
      where: {
        studentId_tripId: {
          studentId: student.id,
          tripId,
        },
      },
      create: {
        studentId: student.id,
        tripId,
        status: 'ON_BOARD',
        confirmedAt: new Date(),
      },
      update: {
        status: 'ON_BOARD',
        confirmedAt: new Date(),
      },
    });

    // Update bus occupancy status
    const onBoardCount = await prisma.boardingConfirmation.count({
      where: { tripId, status: 'ON_BOARD' },
    });

    const newOccupancy = Math.max(trip.bus.currentOccupancy, onBoardCount);
    const cap = trip.bus.capacity || 40;
    const ratio = newOccupancy / cap;
    let status = trip.bus.occupancyStatus;
    if (ratio >= 0.95) status = 'FULL';
    else if (ratio >= 0.70) status = 'HIGH';
    else if (ratio >= 0.35) status = 'MEDIUM';
    else status = 'LOW';

    const updatedBus = await prisma.bus.update({
      where: { id: trip.busId },
      data: {
        currentOccupancy: newOccupancy,
        occupancyStatus: status,
        occupancyUpdatedAt: new Date(),
        occupancyUpdatedBy: 'STUDENT_BOARDING',
      },
    });

    // Broadcast occupancy update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`bus_${trip.busId}`).to(`college_${trip.collegeId}`).emit('bus:occupancy:update', {
        busId: trip.busId,
        busNumber: trip.bus.busNumber,
        currentOccupancy: updatedBus.currentOccupancy,
        occupancyStatus: updatedBus.occupancyStatus,
        capacity: updatedBus.capacity,
        updatedAt: updatedBus.occupancyUpdatedAt,
      });
    }

    return res.json({
      success: true,
      message: 'Boarding confirmed! You are marked on board.',
      confirmation,
      busOccupancy: {
        currentOccupancy: updatedBus.currentOccupancy,
        occupancyStatus: updatedBus.occupancyStatus,
      },
    });
  } catch (error: any) {
    console.error('Error confirming boarding:', error);
    return res.status(500).json({ error: 'Failed to confirm boarding.' });
  }
});

// POST /api/student/trips/:tripId/alight - Student alighted from bus
router.post('/trips/:tripId/alight', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { bus: true },
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    const confirmation = await prisma.boardingConfirmation.upsert({
      where: {
        studentId_tripId: {
          studentId: student.id,
          tripId,
        },
      },
      create: {
        studentId: student.id,
        tripId,
        status: 'ALIGHTED',
        confirmedAt: new Date(),
      },
      update: {
        status: 'ALIGHTED',
      },
    });

    return res.json({
      success: true,
      message: 'You have alighted from the bus.',
      confirmation,
    });
  } catch (error: any) {
    console.error('Error recording alighting:', error);
    return res.status(500).json({ error: 'Failed to record alighting.' });
  }
});

// GET /api/student/boarding-status/:tripId
router.get('/boarding-status/:tripId', async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const confirmation = await prisma.boardingConfirmation.findUnique({
      where: {
        studentId_tripId: {
          studentId: student.id,
          tripId,
        },
      },
    });

    return res.json({
      success: true,
      isOnBoard: confirmation?.status === 'ON_BOARD',
      confirmation,
    });
  } catch (error: any) {
    console.error('Error fetching boarding status:', error);
    return res.status(500).json({ error: 'Failed to fetch boarding status.' });
  }
});

// POST /api/student/guardian-link - Generate secure parent/guardian tracking link
router.post('/guardian-link', async (req: Request, res: Response) => {
  try {
    const { busId, label, expiryHours = 24 } = req.body;
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      include: { user: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    let targetBusId = busId;
    if (!targetBusId) {
      const bus = await prisma.bus.findFirst({
        where: { collegeId: student.collegeId, routeId: student.routeId },
      });
      targetBusId = bus?.id;
    }

    if (!targetBusId) {
      return res.status(400).json({ error: 'Please select a bus to create a tracking link.' });
    }

    // High entropy 32 bytes cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const hours = Math.min(Math.max(Number(expiryHours) || 24, 1), 72);
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    const record = await prisma.guardianTrackingLink.create({
      data: {
        tokenHash,
        studentId: student.id,
        busId: targetBusId,
        label: label || `Tracking for ${student.user.name}`,
        expiresAt,
      },
    });

    return res.json({
      success: true,
      message: 'Guardian tracking link created successfully.',
      token: rawToken, // ONLY revealed once at creation
      relativeUrl: `/track/bus/${targetBusId}?token=${rawToken}`,
      id: record.id,
      expiresAt: record.expiresAt,
      label: record.label,
    });
  } catch (error: any) {
    console.error('Error creating guardian link:', error);
    return res.status(500).json({ error: 'Failed to create guardian tracking link.' });
  }
});

// GET /api/student/guardian-links - List active links
router.get('/guardian-links', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const links = await prisma.guardianTrackingLink.findMany({
      where: { studentId: student.id, isRevoked: false },
      include: {
        bus: { select: { busNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      links: links.map((l) => ({
        id: l.id,
        busId: l.busId,
        busNumber: l.bus.busNumber,
        label: l.label,
        expiresAt: l.expiresAt,
        isExpired: new Date() > new Date(l.expiresAt),
        createdAt: l.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching guardian links:', error);
    return res.status(500).json({ error: 'Failed to fetch guardian links.' });
  }
});

// DELETE /api/student/guardian-links/:id - Revoke link
router.delete('/guardian-links/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    await prisma.guardianTrackingLink.updateMany({
      where: { id, studentId: student.id },
      data: { isRevoked: true },
    });

    return res.json({ success: true, message: 'Tracking link revoked successfully.' });
  } catch (error: any) {
    console.error('Error revoking guardian link:', error);
    return res.status(500).json({ error: 'Failed to revoke tracking link.' });
  }
});

// PUT /api/student/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    await prisma.notification.updateMany({
      where: { id, studentId: student.id },
      data: { readAt: new Date() },
    });

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ error: 'Failed to mark notification read.' });
  }
});

// PUT /api/student/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    await prisma.notification.updateMany({
      where: { studentId: student.id, readAt: null },
      data: { readAt: new Date() },
    });

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Error marking all read:', error);
    return res.status(500).json({ error: 'Failed to mark notifications read.' });
  }
});

export default router;
