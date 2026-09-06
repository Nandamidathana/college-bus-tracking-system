import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { calculateDistanceMeters, formatDistance, estimateTravelTimeMinutes } from '../utils/haversine';
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

    let finalBoardingPointId = student.boardingPointId;

    // 2. If new coordinates provided or custom stop
    if (latitude !== undefined && longitude !== undefined) {
      if (student.boardingPointId) {
        await prisma.boardingPoint.update({
          where: { id: student.boardingPointId },
          data: {
            ...(boardingPointName ? { name: boardingPointName.trim() } : {}),
            latitude: parseFloat(String(latitude)),
            longitude: parseFloat(String(longitude)),
            ...(routeId ? { routeId } : {}),
          },
        });
      } else {
        const newBp = await prisma.boardingPoint.create({
          data: {
            name: boardingPointName ? boardingPointName.trim() : 'My Boarding Stop',
            latitude: parseFloat(String(latitude)),
            longitude: parseFloat(String(longitude)),
            routeId: routeId || student.routeId,
            sequence: 99,
          },
        });
        finalBoardingPointId = newBp.id;
      }
    } else if (boardingPointId && boardingPointId !== 'CUSTOM') {
      finalBoardingPointId = boardingPointId;
    }

    // 3. Update student record
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        ...(village ? { village: village.trim() } : {}),
        ...(routeId ? { routeId } : {}),
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
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const student = await prisma.student.findFirst({
      where: { userId: req.user!.userId },
      include: { boardingPoint: true, route: true },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    let bp;
    if (student.boardingPointId) {
      bp = await prisma.boardingPoint.update({
        where: { id: student.boardingPointId },
        data: {
          name: name ? name.trim() : student.boardingPoint.name,
          latitude: parseFloat(String(latitude)),
          longitude: parseFloat(String(longitude)),
        },
      });
    } else {
      bp = await prisma.boardingPoint.create({
        data: {
          name: name ? name.trim() : 'My Live Location',
          latitude: parseFloat(String(latitude)),
          longitude: parseFloat(String(longitude)),
          routeId: student.routeId,
          sequence: 99,
        },
      });
      await prisma.student.update({
        where: { id: student.id },
        data: { boardingPointId: bp.id },
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

    // 1. Distance & ETA to Student's designated stop
    let distanceToStudentMeters = 0;
    let formattedDistanceToStudent = '0 m';
    let etaMinutesToStudent = 0;

    if (student.boardingPoint) {
      distanceToStudentMeters = calculateDistanceMeters(
        live.latitude,
        live.longitude,
        student.boardingPoint.latitude,
        student.boardingPoint.longitude
      );
      formattedDistanceToStudent = formatDistance(distanceToStudentMeters);
      etaMinutesToStudent = estimateTravelTimeMinutes(distanceToStudentMeters);
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
    } else if (distanceToStudentMeters <= 500) {
      status = 'NEARBY';
    } else if (distanceToStudentMeters <= ENV.PROXIMITY_THRESHOLD_METERS) {
      status = 'APPROACHING';
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
      boardingPoint: {
        name: student.boardingPoint.name,
        latitude: student.boardingPoint.latitude,
        longitude: student.boardingPoint.longitude,
      },
      college: {
        name: student.college.name,
        latitude: student.college.latitude,
        longitude: student.college.longitude,
      },
      distance: {
        meters: Math.round(distanceToStudentMeters),
        formatted: formattedDistanceToStudent,
        estimatedMinutes: etaMinutesToStudent,
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

export default router;
