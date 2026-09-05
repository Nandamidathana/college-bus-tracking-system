import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Apply authentication and DRIVER role guard
router.use(authenticate, requireRole(['DRIVER']));

// GET /api/driver/profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.userId },
      include: {
        user: { select: { name: true, phone: true } },
        college: true,
        assignedBus: {
          include: {
            route: {
              include: {
                boardingPoints: { orderBy: { sequence: 'asc' } },
              },
            },
          },
        },
        trips: {
          where: { status: 'ACTIVE' },
          include: {
            bus: {
              include: {
                route: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    const activeTrip = driver.trips[0] || null;

    return res.json({
      success: true,
      driver: {
        id: driver.id,
        driverName: driver.driverName,
        phone: driver.phone,
        approvalStatus: driver.approvalStatus,
        status: activeTrip ? 'ON_TRIP' : driver.status,
        college: driver.college,
        assignedBus: driver.assignedBus,
        activeTrip,
      },
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    return res.status(500).json({ error: 'Failed to fetch driver profile.' });
  }
});

// GET /api/driver/buses - List of all buses in the driver's college
router.get('/buses', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const buses = await prisma.bus.findMany({
      where: { collegeId },
      include: {
        route: true,
        assignedDriver: { select: { id: true, driverName: true } },
      },
      orderBy: { busNumber: 'asc' },
    });

    return res.json({ success: true, buses });
  } catch (error) {
    console.error('Error fetching driver buses:', error);
    return res.status(500).json({ error: 'Failed to fetch buses.' });
  }
});

// GET /api/driver/current-trip
router.get('/current-trip', async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE',
      },
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
      },
    });

    return res.json({
      success: true,
      activeTrip: activeTrip || null,
      isTracking: activeTrip !== null,
    });
  } catch (error) {
    console.error('Error fetching current trip:', error);
    return res.status(500).json({ error: 'Failed to fetch current trip.' });
  }
});

// POST /api/driver/trips/start
router.post('/trips/start', async (req: Request, res: Response) => {
  try {
    const { busId, busNumber, latitude, longitude, accuracy } = req.body;
    const collegeId = req.user!.collegeId;

    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.userId },
      include: { college: true },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver record not found.' });
    }

    if (driver.approvalStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'Driver is not approved by the college administrator.' });
    }

    // Check if driver already has an active trip
    const existingActiveTrip = await prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE',
      },
      include: { bus: true },
    });

    if (existingActiveTrip) {
      return res.status(400).json({
        error: `You already have an active trip with bus ${existingActiveTrip.bus.busNumber}. Please end it first.`,
        activeTrip: existingActiveTrip,
      });
    }

    // Resolve bus
    let targetBusId = busId;
    if (!targetBusId && busNumber) {
      const cleanBusNum = busNumber.trim().toUpperCase();
      let bus = await prisma.bus.findUnique({
        where: {
          collegeId_busNumber: {
            collegeId,
            busNumber: cleanBusNum,
          },
        },
      });

      // If bus does not exist yet in this college, auto-create it
      if (!bus) {
        bus = await prisma.bus.create({
          data: {
            busNumber: cleanBusNum,
            collegeId,
            status: 'INACTIVE',
          },
        });
      }
      targetBusId = bus.id;
    }

    if (!targetBusId && driver.assignedBusId) {
      targetBusId = driver.assignedBusId;
    }

    if (!targetBusId) {
      return res.status(400).json({ error: 'Please select or enter a bus number to start the trip.' });
    }

    // Verify target bus belongs to college
    const bus = await prisma.bus.findUnique({
      where: { id: targetBusId },
      include: {
        route: {
          include: {
            boardingPoints: { orderBy: { sequence: 'asc' } },
          },
        },
        trips: {
          where: { status: 'ACTIVE' },
          include: { driver: true },
          take: 1,
        },
      },
    });

    if (!bus || bus.collegeId !== collegeId) {
      return res.status(403).json({ error: 'Selected bus is not valid for your college.' });
    }

    // Check if another driver is already on an active trip with this bus
    const conflictingTrip = bus.trips[0];
    if (conflictingTrip && conflictingTrip.driverId !== driver.id) {
      return res.status(400).json({
        error: `Bus ${bus.busNumber} is already on an active trip driven by ${conflictingTrip.driver.driverName}.`,
      });
    }

    // Determine Trip Direction (Morning Pickup vs Evening Return)
    const { tripType: reqTripType } = req.body;
    const istHours = (new Date().getUTCHours() + 5.5) % 24;
    const determinedTripType = reqTripType || (istHours >= 13 ? 'EVENING_RETURN' : 'MORNING_PICKUP');

    // Auto-resolve route and ordered stops
    let route = bus.route;
    if (!route || !route.boardingPoints || route.boardingPoints.length === 0) {
      const fallbackRoute = await prisma.route.findFirst({
        where: { collegeId },
        include: { boardingPoints: { orderBy: { sequence: 'asc' } } },
      });
      if (fallbackRoute) {
        route = fallbackRoute;
        await prisma.bus.update({
          where: { id: bus.id },
          data: { routeId: fallbackRoute.id },
        });
      }
    }

    const routeStops = (route?.boardingPoints || []).sort((a: any, b: any) => a.sequence - b.sequence);
    const college = driver.college;

    let originName = '';
    let destinationName = '';
    let destinationLat = college?.latitude || 16.35068;
    let destinationLng = college?.longitude || 81.04273;
    let finalStopId: string | null = null;

    if (determinedTripType === 'MORNING_PICKUP') {
      const firstStop = routeStops.length > 0 ? routeStops[0] : null;
      originName = firstStop ? firstStop.name : 'Starting Village / Depot';
      destinationName = college?.name ? `${college.name} Gate` : 'SRGEC College Gate';
      destinationLat = college?.latitude || 16.35068;
      destinationLng = college?.longitude || 81.04273;
      finalStopId = null;
    } else {
      originName = college?.name ? `${college.name} Gate` : 'SRGEC College Gate';
      // In evening return, destination is the farthest village stop (highest sequence)
      // Exclude college campus stops from being the return destination
      const villageStops = routeStops.filter((s: any) =>
        !s.name.toLowerCase().includes('college') &&
        !s.name.toLowerCase().includes('campus') &&
        !s.name.toLowerCase().includes('gate')
      );
      const lastStop = villageStops.length > 0
        ? villageStops[villageStops.length - 1]
        : (routeStops.length > 0 ? routeStops[routeStops.length - 1] : null);

      if (lastStop) {
        destinationName = `${lastStop.name} (Terminus)`;
        destinationLat = lastStop.latitude;
        destinationLng = lastStop.longitude;
        finalStopId = lastStop.id;
      } else {
        destinationName = 'Gudivada Bus Stand (Terminus)';
        destinationLat = 16.431025;
        destinationLng = 80.997348;
      }
    }

    // Create active trip with dynamic destination
    const trip = await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: driver.id,
        collegeId,
        tripType: determinedTripType,
        originName,
        destinationName,
        destinationLat,
        destinationLng,
        finalStopId,
        startTime: new Date(),
        status: 'ACTIVE',
      },
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
      },
    });

    // Update Bus and Driver states
    await prisma.bus.update({
      where: { id: bus.id },
      data: {
        status: 'ACTIVE',
        assignedDriverId: driver.id,
      },
    });

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        status: 'ON_TRIP',
        assignedBusId: bus.id,
      },
    });

    // Initialize LiveLocation immediately so students see the bus as LIVE right away
    const initLat = latitude !== undefined ? parseFloat(String(latitude)) : (driver.college?.latitude || 16.35068);
    const initLng = longitude !== undefined ? parseFloat(String(longitude)) : (driver.college?.longitude || 81.04273);
    const initAcc = accuracy !== undefined ? parseFloat(String(accuracy)) : 10;

    const liveLoc = await prisma.liveLocation.upsert({
      where: { busId: bus.id },
      create: {
        busId: bus.id,
        tripId: trip.id,
        driverId: driver.id,
        latitude: initLat,
        longitude: initLng,
        accuracy: initAcc,
        speed: 0,
        heading: 0,
        timestamp: new Date(),
        isStale: false,
      },
      update: {
        tripId: trip.id,
        driverId: driver.id,
        latitude: initLat,
        longitude: initLng,
        accuracy: initAcc,
        speed: 0,
        heading: 0,
        timestamp: new Date(),
        isStale: false,
      },
    });

    // Broadcast trip started & live location events via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const payload = {
        busId: bus.id,
        busNumber: bus.busNumber,
        driverId: driver.id,
        driverName: driver.driverName,
        tripId: trip.id,
        tripType: trip.tripType,
        originName: trip.originName,
        destinationName: trip.destinationName,
        destinationLat: trip.destinationLat,
        destinationLng: trip.destinationLng,
        startTime: trip.startTime,
        latitude: liveLoc.latitude,
        longitude: liveLoc.longitude,
        accuracy: liveLoc.accuracy,
        speed: 0,
        heading: 0,
        timestamp: liveLoc.timestamp.toISOString(),
        isStale: false,
        status: 'LIVE',
      };

      io.to(`college_${collegeId}`).to(`bus_${bus.id}`).emit('bus:trip:started', payload);
      io.to(`college_${collegeId}`).to(`bus_${bus.id}`).emit('bus:location:update', payload);
    }

    return res.status(201).json({
      success: true,
      message: `Trip started successfully for bus ${bus.busNumber}.`,
      trip,
    });
  } catch (error: any) {
    console.error('Error starting trip:', error);
    return res.status(500).json({ error: error.message || 'Failed to start trip.' });
  }
});

// POST /api/driver/trips/end
router.post('/trips/end', async (req: Request, res: Response) => {
  try {
    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE',
      },
      include: { bus: true },
    });

    if (!activeTrip) {
      return res.status(400).json({ error: 'No active trip found to end.' });
    }

    const busId = activeTrip.busId;
    const busNumber = activeTrip.bus.busNumber;

    // Mark trip COMPLETED
    const completedTrip = await prisma.trip.update({
      where: { id: activeTrip.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
    });

    // Mark bus and driver offline/inactive
    await prisma.bus.update({
      where: { id: busId },
      data: { status: 'INACTIVE' },
    });

    await prisma.driver.update({
      where: { id: driver.id },
      data: { status: 'AVAILABLE' },
    });

    // Remove or reset live location record
    await prisma.liveLocation.deleteMany({
      where: { busId },
    });

    // Broadcast trip ended to students and admin
    const io = req.app.get('io');
    if (io) {
      io.to(`college_${driver.collegeId}`).to(`bus_${busId}`).emit('bus:trip:ended', {
        busId,
        busNumber,
        tripId: activeTrip.id,
        driverId: driver.id,
        endTime: completedTrip.endTime,
        status: 'OFFLINE',
        message: `Bus ${busNumber} is currently not on an active trip.`,
      });
    }

    return res.json({
      success: true,
      message: `Trip for bus ${busNumber} ended successfully.`,
      trip: completedTrip,
    });
  } catch (error: any) {
    console.error('Error ending trip:', error);
    return res.status(500).json({ error: 'Failed to end trip.' });
  }
});

// PUT /api/driver/change-bus - Seamless bus switching
router.put('/change-bus', async (req: Request, res: Response) => {
  try {
    const { newBusId, newBusNumber } = req.body;
    const collegeId = req.user!.collegeId;

    const driver = await prisma.driver.findFirst({
      where: { userId: req.user!.userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    let targetBusId = newBusId;
    if (!targetBusId && newBusNumber) {
      const cleanBusNum = newBusNumber.trim().toUpperCase();
      let bus = await prisma.bus.findUnique({
        where: {
          collegeId_busNumber: {
            collegeId,
            busNumber: cleanBusNum,
          },
        },
      });

      if (!bus) {
        bus = await prisma.bus.create({
          data: {
            busNumber: cleanBusNum,
            collegeId,
            status: 'INACTIVE',
          },
        });
      }
      targetBusId = bus.id;
    }

    if (!targetBusId) {
      return res.status(400).json({ error: 'New bus ID or number is required.' });
    }

    const newBus = await prisma.bus.findUnique({
      where: { id: targetBusId },
      include: {
        trips: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    if (!newBus || newBus.collegeId !== collegeId) {
      return res.status(404).json({ error: 'New bus not found in your college.' });
    }

    // Check if new bus is currently in use by another driver
    if (newBus.trips[0] && newBus.trips[0].driverId !== driver.id) {
      return res.status(400).json({
        error: `Bus ${newBus.busNumber} is currently on an active trip with another driver.`,
      });
    }

    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: 'ACTIVE',
      },
      include: { bus: true },
    });

    const oldBusId = driver.assignedBusId;
    const oldBusNumber = activeTrip?.bus?.busNumber;

    if (activeTrip) {
      // Reassign active trip to new bus
      await prisma.trip.update({
        where: { id: activeTrip.id },
        data: { busId: newBus.id },
      });

      // Move live location if any
      const existingLoc = await prisma.liveLocation.findUnique({
        where: { busId: activeTrip.busId },
      });

      if (existingLoc) {
        await prisma.liveLocation.delete({ where: { busId: activeTrip.busId } });
        await prisma.liveLocation.upsert({
          where: { busId: newBus.id },
          create: {
            busId: newBus.id,
            tripId: activeTrip.id,
            driverId: driver.id,
            latitude: existingLoc.latitude,
            longitude: existingLoc.longitude,
            accuracy: existingLoc.accuracy,
            speed: existingLoc.speed,
            heading: existingLoc.heading,
            timestamp: new Date(),
            isStale: false,
          },
          update: {
            tripId: activeTrip.id,
            driverId: driver.id,
            latitude: existingLoc.latitude,
            longitude: existingLoc.longitude,
            timestamp: new Date(),
            isStale: false,
          },
        });
      }

      // Mark old bus inactive
      await prisma.bus.update({
        where: { id: activeTrip.busId },
        data: { status: 'INACTIVE', assignedDriverId: null },
      });
    }

    // Update new bus and driver
    await prisma.bus.update({
      where: { id: newBus.id },
      data: {
        status: activeTrip ? 'ACTIVE' : 'INACTIVE',
        assignedDriverId: driver.id,
      },
    });

    await prisma.driver.update({
      where: { id: driver.id },
      data: { assignedBusId: newBus.id },
    });

    // Notify rooms via socket
    const io = req.app.get('io');
    if (io) {
      if (oldBusId) {
        io.to(`bus_${oldBusId}`).emit('bus:trip:ended', {
          busId: oldBusId,
          busNumber: oldBusNumber,
          status: 'OFFLINE',
          message: `Bus assignment changed.`,
        });
      }

      io.to(`college_${collegeId}`).to(`bus_${newBus.id}`).emit('driver:bus:changed', {
        driverId: driver.id,
        driverName: driver.driverName,
        oldBusId,
        newBusId: newBus.id,
        newBusNumber: newBus.busNumber,
        status: activeTrip ? 'LIVE' : 'INACTIVE',
      });
    }

    return res.json({
      success: true,
      message: `Bus changed successfully to ${newBus.busNumber}.`,
      assignedBus: newBus,
    });
  } catch (error: any) {
    console.error('Error changing bus:', error);
    return res.status(500).json({ error: error.message || 'Failed to change bus.' });
  }
});

export default router;
