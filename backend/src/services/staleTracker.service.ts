import { Server } from 'socket.io';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';

let staleCheckInterval: NodeJS.Timeout | null = null;

export function startStaleTracker(io: Server) {
  if (staleCheckInterval) {
    clearInterval(staleCheckInterval);
  }

  // Check every 10 seconds for stale locations
  staleCheckInterval = setInterval(async () => {
    try {
      const activeTrips = await prisma.trip.findMany({
        where: { status: 'ACTIVE' },
        include: {
          bus: {
            include: {
              liveLocation: true,
            },
          },
        },
      });

      const now = Date.now();

      for (const trip of activeTrips) {
        if (!trip.bus || !trip.bus.liveLocation) continue;

        const live = trip.bus.liveLocation;
        const lastUpdated = new Date(live.timestamp).getTime();
        const ageMs = now - lastUpdated;

        if (ageMs > ENV.STALE_TIMEOUT_MS && !live.isStale) {
          // Mark as stale in DB
          await prisma.liveLocation.update({
            where: { busId: live.busId },
            data: { isStale: true },
          });

          // Broadcast status change to college & bus rooms
          io.to(`college_${trip.collegeId}`).to(`bus_${live.busId}`).emit('bus:status:changed', {
            busId: live.busId,
            busNumber: trip.bus.busNumber,
            tripId: trip.id,
            status: 'LOCATION_DELAYED',
            isStale: true,
            message: 'Bus location has not updated recently.',
            lastUpdated: live.timestamp,
            ageSeconds: Math.round(ageMs / 1000),
          });
        }
      }
    } catch (error) {
      console.error('Error in stale location tracker:', error);
    }
  }, 10000);
}

export function stopStaleTracker() {
  if (staleCheckInterval) {
    clearInterval(staleCheckInterval);
    staleCheckInterval = null;
  }
}
