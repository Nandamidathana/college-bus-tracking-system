import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';

const router = Router();

// GET /api/public/vapid-key - Serves public VAPID key to frontend service worker
router.get('/vapid-key', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    publicKey: ENV.VAPID_PUBLIC_KEY || '',
  });
});

// GET /api/public/track/bus/:busId?token=... - Secure read-only parent/guardian bus tracking
router.get('/track/bus/:busId', async (req: Request, res: Response) => {
  try {
    const { busId } = req.params;
    const token = (req.query.token as string)?.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Tracking token is missing. Please use a valid guardian link.',
      });
    }

    // Hash token with SHA-256 to compare with stored token hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const link = await prisma.guardianTrackingLink.findUnique({
      where: { tokenHash },
      include: {
        bus: {
          include: {
            college: { select: { name: true, address: true, latitude: true, longitude: true } },
            route: {
              include: {
                boardingPoints: { orderBy: { sequence: 'asc' } },
              },
            },
            liveLocation: true,
            trips: {
              where: { status: 'ACTIVE' },
              take: 1,
            },
          },
        },
      },
    });

    if (!link) {
      return res.status(403).json({
        success: false,
        error: 'Tracking link is invalid or has expired.',
      });
    }

    if (link.isRevoked) {
      return res.status(403).json({
        success: false,
        error: 'This tracking link has been revoked by the student.',
      });
    }

    if (new Date() > new Date(link.expiresAt)) {
      return res.status(403).json({
        success: false,
        error: 'This tracking link has expired. Please ask the student to generate a new link.',
      });
    }

    if (link.busId !== busId) {
      return res.status(403).json({
        success: false,
        error: 'Token does not match the requested bus.',
      });
    }

    const bus = (link as any).bus;
    const activeTrip = bus.trips[0] || null;
    const hasLiveLoc = bus.liveLocation !== null;

    let status = 'OFFLINE';
    if (activeTrip && hasLiveLoc) {
      status = bus.liveLocation!.isStale ? 'LOCATION_DELAYED' : 'LIVE';
    }

    // Determine occupancy status freshness
    const isOccupancyStale = bus.occupancyUpdatedAt
      ? (Date.now() - new Date(bus.occupancyUpdatedAt).getTime()) > ENV.OCCUPANCY_STALE_MINUTES * 60 * 1000
      : true;

    // Sanitize response: NEVER return student names, phones, driver personal phones or credentials!
    return res.json({
      success: true,
      guardianView: true,
      label: link.label || 'Student Transit Link',
      expiresAt: link.expiresAt,
      bus: {
        id: bus.id,
        busNumber: bus.busNumber,
        capacity: bus.capacity,
        currentOccupancy: bus.currentOccupancy,
        occupancyStatus: isOccupancyStale ? 'UNKNOWN' : bus.occupancyStatus,
        occupancyUpdatedAt: bus.occupancyUpdatedAt,
        status,
        college: bus.college,
        route: bus.route
          ? {
              name: bus.route.name,
              routeNumber: bus.route.routeNumber,
              boardingPoints: (bus.route.boardingPoints || []).map((bp: any) => ({
                id: bp.id,
                name: bp.name,
                sequence: bp.sequence,
                latitude: bp.latitude,
                longitude: bp.longitude,
              })),
            }
          : null,
        activeTrip: activeTrip
          ? {
              id: activeTrip.id,
              tripType: activeTrip.tripType,
              originName: activeTrip.originName,
              destinationName: activeTrip.destinationName,
              startTime: activeTrip.startTime,
            }
          : null,
        liveLocation:
          activeTrip && bus.liveLocation
            ? {
                latitude: bus.liveLocation.latitude,
                longitude: bus.liveLocation.longitude,
                speed: bus.liveLocation.speed,
                heading: bus.liveLocation.heading,
                accuracy: bus.liveLocation.accuracy,
                timestamp: bus.liveLocation.timestamp,
                isStale: bus.liveLocation.isStale,
              }
            : null,
      },
    });
  } catch (error: any) {
    console.error('Error fetching guardian tracking data:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve tracking data.' });
  }
});

export default router;
