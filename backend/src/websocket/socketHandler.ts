import { Server, Socket } from 'socket.io';
import { verifyToken, AuthUser } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { validateGpsUpdate, LocationPayload } from '../utils/gpsValidator';
import { checkAndEmitProximityAlerts } from '../services/proximity.service';
import { checkCollegeGateGeofence } from '../services/geofence.service';

export function setupWebSocket(io: Server) {
  // Authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.replace('Bearer ', ''));

    if (!token) {
      return next(new Error('Authentication error: Token not provided.'));
    }

    const user = verifyToken(token);
    if (!user) {
      return next(new Error('Authentication error: Invalid token.'));
    }

    socket.data.user = user;
    next();
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    // Join college-specific room for data isolation
    socket.join(`college_${user.collegeId}`);

    // Join personal user/role rooms
    if (user.role === 'STUDENT' && user.studentId) {
      socket.join(`student_${user.studentId}`);
    } else if (user.role === 'DRIVER' && user.driverId) {
      socket.join(`driver_${user.driverId}`);
    }

    // 1. Subscribe to specific bus live stream
    socket.on('bus:subscribe', async (data: { busId: string }) => {
      try {
        if (!data || !data.busId) return;

        // Verify that the bus belongs to the user's college
        const bus = await prisma.bus.findUnique({
          where: { id: data.busId },
          include: {
            liveLocation: true,
            trips: {
              where: { status: 'ACTIVE' },
              include: { driver: true },
              take: 1,
            },
          },
        });

        if (!bus || bus.collegeId !== user.collegeId) {
          socket.emit('error', { message: 'Unauthorized: Bus does not belong to your college.' });
          return;
        }

        socket.join(`bus_${data.busId}`);

        // Send current live location immediately if active trip exists
        const activeTrip = bus.trips[0];
        if (activeTrip && bus.liveLocation) {
          socket.emit('bus:location:update', {
            busId: bus.id,
            busNumber: bus.busNumber,
            tripId: activeTrip.id,
            tripType: activeTrip.tripType,
            originName: activeTrip.originName,
            destinationName: activeTrip.destinationName,
            destinationLat: activeTrip.destinationLat,
            destinationLng: activeTrip.destinationLng,
            driverName: activeTrip.driver.driverName,
            latitude: bus.liveLocation.latitude,
            longitude: bus.liveLocation.longitude,
            accuracy: bus.liveLocation.accuracy,
            speed: bus.liveLocation.speed,
            heading: bus.liveLocation.heading,
            timestamp: bus.liveLocation.timestamp,
            isStale: bus.liveLocation.isStale,
            status: bus.liveLocation.isStale ? 'LOCATION_DELAYED' : 'LIVE',
          });
        }
      } catch (err) {
        console.error('Error on bus:subscribe:', err);
      }
    });

    // 2. Unsubscribe from bus
    socket.on('bus:unsubscribe', (data: { busId: string }) => {
      if (data && data.busId) {
        socket.leave(`bus_${data.busId}`);
      }
    });

    // 3. Driver Live GPS update stream
    socket.on('driver:location:update', async (data: LocationPayload) => {
      try {
        if (user.role !== 'DRIVER') {
          socket.emit('error', { message: 'Only authorized drivers can send GPS updates.' });
          return;
        }

        const driver = await prisma.driver.findUnique({
          where: { userId: user.userId },
          include: {
            trips: {
              where: { status: 'ACTIVE' },
              include: { bus: true },
              take: 1,
            },
          },
        });

        if (!driver || driver.approvalStatus !== 'APPROVED') {
          socket.emit('error', { message: 'Driver is not approved by college admin.' });
          return;
        }

        const activeTrip = driver.trips[0];
        if (!activeTrip || !activeTrip.busId) {
          socket.emit('error', { message: 'No active trip found for this driver.' });
          return;
        }

        const bus = activeTrip.bus;

        // Fetch previous location to detect anomalies/jumps
        const previousLocation = await prisma.liveLocation.findUnique({
          where: { busId: bus.id },
        });

        // Validate GPS update
        const validation = validateGpsUpdate(
          data,
          previousLocation
            ? {
                latitude: previousLocation.latitude,
                longitude: previousLocation.longitude,
                timestamp: previousLocation.timestamp,
              }
            : null
        );

        if (!validation.isValid || !validation.cleanedLocation) {
          socket.emit('driver:gps:warning', {
            message: validation.reason || 'GPS data filtered out.',
            raw: data,
          });
          return;
        }

        const clean = validation.cleanedLocation;

        // Upsert latest live location
        const liveRecord = await prisma.liveLocation.upsert({
          where: { busId: bus.id },
          create: {
            busId: bus.id,
            tripId: activeTrip.id,
            driverId: driver.id,
            latitude: clean.latitude,
            longitude: clean.longitude,
            accuracy: clean.accuracy,
            speed: clean.speed,
            heading: clean.heading,
            timestamp: clean.timestamp,
            isStale: false,
          },
          update: {
            tripId: activeTrip.id,
            driverId: driver.id,
            latitude: clean.latitude,
            longitude: clean.longitude,
            accuracy: clean.accuracy,
            speed: clean.speed,
            heading: clean.heading,
            timestamp: clean.timestamp,
            isStale: false,
          },
        });

        // Log location history
        await prisma.locationHistory.create({
          data: {
            busId: bus.id,
            tripId: activeTrip.id,
            latitude: clean.latitude,
            longitude: clean.longitude,
            accuracy: clean.accuracy,
            speed: clean.speed,
            heading: clean.heading,
            timestamp: clean.timestamp,
          },
        });

        const payload = {
          busId: bus.id,
          busNumber: bus.busNumber,
          tripId: activeTrip.id,
          tripType: activeTrip.tripType,
          originName: activeTrip.originName,
          destinationName: activeTrip.destinationName,
          destinationLat: activeTrip.destinationLat,
          destinationLng: activeTrip.destinationLng,
          driverId: driver.id,
          driverName: driver.driverName,
          latitude: clean.latitude,
          longitude: clean.longitude,
          accuracy: clean.accuracy,
          speed: clean.speed,
          heading: clean.heading,
          timestamp: clean.timestamp.toISOString(),
          isStale: false,
          status: 'LIVE',
        };

        // Broadcast to college room (for admin map & college monitors)
        // and to bus room (for students listening to this bus)
        io.to(`college_${user.collegeId}`).to(`bus_${bus.id}`).emit('bus:location:update', payload);

        // Acknowledge driver update
        socket.emit('driver:location:ack', {
          success: true,
          timestamp: clean.timestamp.toISOString(),
        });

        // Run proximity alert checks (2 km trigger)
        await checkAndEmitProximityAlerts(
          io,
          activeTrip.id,
          bus.id,
          bus.busNumber,
          clean.latitude,
          clean.longitude
        );

        // Run automated College Gate Geofencing & 9:00 AM Delay Detection check
        await checkCollegeGateGeofence(
          io,
          activeTrip.id,
          bus.id,
          clean.latitude,
          clean.longitude,
          clean.speed,
          clean.heading
        );
      } catch (err) {
        console.error('Error handling driver:location:update:', err);
        socket.emit('error', { message: 'Internal server error while processing GPS update.' });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
}
