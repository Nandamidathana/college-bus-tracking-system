import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { geocodeLocation, lookupRegionalDatabase } from '../services/geocoding.service';

const router = Router();

// Apply authentication and ADMIN role guard
router.use(authenticate, requireRole(['ADMIN']));

// GET /api/admin/dashboard - High-level statistics and active fleet
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const [totalBuses, totalDrivers, totalStudents, activeTrips, college] = await Promise.all([
      prisma.bus.count({ where: { collegeId } }),
      prisma.driver.count({ where: { collegeId } }),
      prisma.student.count({ where: { collegeId } }),
      prisma.trip.findMany({
        where: { collegeId, status: 'ACTIVE' },
        include: {
          bus: {
            include: {
              liveLocation: true,
              route: true,
            },
          },
          driver: true,
        },
      }),
      prisma.college.findUnique({
        where: { id: collegeId },
      }),
    ]);

    const activeBusesCount = activeTrips.length;
    const activeDriversCount = activeTrips.length;

    const liveBuses = activeTrips.map((trip) => ({
      tripId: trip.id,
      busId: trip.busId,
      busNumber: trip.bus.busNumber,
      driverName: trip.driver.driverName,
      driverPhone: trip.driver.phone,
      routeName: trip.bus.route?.name || 'Unassigned Route',
      startTime: trip.startTime,
      latitude: trip.bus.liveLocation?.latitude || null,
      longitude: trip.bus.liveLocation?.longitude || null,
      speed: trip.bus.liveLocation?.speed || 0,
      heading: trip.bus.liveLocation?.heading || 0,
      accuracy: trip.bus.liveLocation?.accuracy || 0,
      isStale: trip.bus.liveLocation?.isStale || false,
      lastUpdate: trip.bus.liveLocation?.timestamp || trip.startTime,
      status: trip.bus.liveLocation?.isStale ? 'LOCATION_DELAYED' : 'LIVE',
    }));

    return res.json({
      success: true,
      stats: {
        totalBuses,
        activeBuses: activeBusesCount,
        totalDrivers,
        activeDrivers: activeDriversCount,
        activeTrips: activeBusesCount,
        totalStudents,
      },
      college,
      liveBuses,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return res.status(500).json({ error: 'Failed to retrieve admin dashboard.' });
  }
});

// GET /api/admin/buses
router.get('/buses', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const buses = await prisma.bus.findMany({
      where: { collegeId },
      include: {
        route: true,
        assignedDriver: true,
        liveLocation: true,
        trips: {
          where: { status: 'ACTIVE' },
          include: { driver: true },
          take: 1,
        },
      },
      orderBy: { busNumber: 'asc' },
    });

    return res.json({ success: true, buses });
  } catch (error) {
    console.error('Error fetching buses:', error);
    return res.status(500).json({ error: 'Failed to fetch buses.' });
  }
});

// POST /api/admin/buses
router.post('/buses', async (req: Request, res: Response) => {
  try {
    const { busNumber, capacity, routeId, assignedDriverId } = req.body;
    const collegeId = req.user!.collegeId;

    if (!busNumber) {
      return res.status(400).json({ error: 'Bus number is required.' });
    }

    const cleanNumber = busNumber.trim().toUpperCase();

    const existing = await prisma.bus.findUnique({
      where: {
        collegeId_busNumber: {
          collegeId,
          busNumber: cleanNumber,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: `Bus ${cleanNumber} already exists in this college.` });
    }

    const bus = await prisma.bus.create({
      data: {
        busNumber: cleanNumber,
        capacity: capacity ? parseInt(capacity, 10) : 40,
        collegeId,
        routeId: routeId || null,
        assignedDriverId: assignedDriverId || null,
        status: 'INACTIVE',
      },
      include: {
        route: true,
        assignedDriver: true,
      },
    });

    return res.status(201).json({ success: true, bus });
  } catch (error: any) {
    console.error('Error creating bus:', error);
    return res.status(500).json({ error: error.message || 'Failed to create bus.' });
  }
});

// PUT /api/admin/buses/:id
router.put('/buses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { busNumber, capacity, routeId, assignedDriverId, status } = req.body;
    const collegeId = req.user!.collegeId;

    const existing = await prisma.bus.findUnique({ where: { id } });
    if (!existing || existing.collegeId !== collegeId) {
      return res.status(404).json({ error: 'Bus not found in your college.' });
    }

    const updated = await prisma.bus.update({
      where: { id },
      data: {
        ...(busNumber ? { busNumber: busNumber.trim().toUpperCase() } : {}),
        ...(capacity !== undefined ? { capacity: parseInt(capacity, 10) } : {}),
        routeId: routeId !== undefined ? routeId : existing.routeId,
        assignedDriverId: assignedDriverId !== undefined ? assignedDriverId : existing.assignedDriverId,
        status: status || existing.status,
      },
      include: {
        route: true,
        assignedDriver: true,
      },
    });

    return res.json({ success: true, bus: updated });
  } catch (error: any) {
    console.error('Error updating bus:', error);
    return res.status(500).json({ error: error.message || 'Failed to update bus.' });
  }
});

// GET /api/admin/drivers
router.get('/drivers', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const drivers = await prisma.driver.findMany({
      where: { collegeId },
      include: {
        user: { select: { name: true, phone: true, email: true } },
        assignedBus: true,
        trips: {
          where: { status: 'ACTIVE' },
          include: { bus: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return res.status(500).json({ error: 'Failed to fetch drivers.' });
  }
});

// PUT /api/admin/drivers/:id - Update driver / approval status / assignment
router.put('/drivers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approvalStatus, status, assignedBusId, driverName, phone } = req.body;
    const collegeId = req.user!.collegeId;

    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing || existing.collegeId !== collegeId) {
      return res.status(404).json({ error: 'Driver not found in your college.' });
    }

    const updated = await prisma.driver.update({
      where: { id },
      data: {
        ...(approvalStatus ? { approvalStatus } : {}),
        ...(status ? { status } : {}),
        assignedBusId: assignedBusId !== undefined ? assignedBusId : existing.assignedBusId,
        ...(driverName ? { driverName: driverName.trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
      },
      include: {
        assignedBus: true,
      },
    });

    return res.json({ success: true, driver: updated });
  } catch (error: any) {
    console.error('Error updating driver:', error);
    return res.status(500).json({ error: error.message || 'Failed to update driver.' });
  }
});

// GET /api/admin/routes
router.get('/routes', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const routes = await prisma.route.findMany({
      where: { collegeId },
      include: {
        boardingPoints: { orderBy: { sequence: 'asc' } },
        buses: true,
        _count: { select: { students: true } },
      },
      orderBy: { routeNumber: 'asc' },
    });

    return res.json({ success: true, routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return res.status(500).json({ error: 'Failed to fetch routes.' });
  }
});

// Helper: Resolve boarding points with high-precision geocoded coordinates
async function resolveBoardingPointsWithCoords(boardingPoints: any[]) {
  if (!Array.isArray(boardingPoints)) return [];
  const resolved = [];
  for (let idx = 0; idx < boardingPoints.length; idx++) {
    const bp = boardingPoints[idx];
    const name = (bp.name || '').trim();
    let lat = parseFloat(String(bp.latitude));
    let lng = parseFloat(String(bp.longitude));

    // If coordinates are invalid, missing, or dummy (16.35, 80.62)
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0 || (lat === 16.35 && lng === 80.62) || (lat === 16.355 && lng === 80.625)) {
      if (name) {
        const geocoded = await geocodeLocation(name);
        if (geocoded) {
          lat = geocoded.latitude;
          lng = geocoded.longitude;
        } else {
          lat = 16.35068;
          lng = 81.04273;
        }
      } else {
        lat = 16.35068;
        lng = 81.04273;
      }
    }

    resolved.push({
      name: name || `Stop ${idx + 1}`,
      latitude: lat,
      longitude: lng,
      sequence: bp.sequence || idx + 1,
    });
  }
  return resolved;
}

// GET /api/admin/geocode?query=...
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.query || '');
    if (!query) {
      return res.json({ success: true, results: [] });
    }
    const regional = lookupRegionalDatabase(query);
    if (regional.length > 0) {
      return res.json({ success: true, results: regional });
    }
    const live = await geocodeLocation(query);
    return res.json({ success: true, results: live ? [live] : [] });
  } catch (error) {
    return res.status(500).json({ error: 'Geocoding search failed.' });
  }
});

// POST /api/admin/routes
router.post('/routes', async (req: Request, res: Response) => {
  try {
    const { name, routeNumber, boardingPoints } = req.body;
    const collegeId = req.user!.collegeId;

    if (!name || !routeNumber) {
      return res.status(400).json({ error: 'Route name and route number are required.' });
    }

    const resolvedStops = await resolveBoardingPointsWithCoords(boardingPoints);

    const route = await prisma.route.create({
      data: {
        name: name.trim(),
        routeNumber: routeNumber.trim().toUpperCase(),
        collegeId,
        boardingPoints: {
          create: resolvedStops,
        },
      },
      include: {
        boardingPoints: { orderBy: { sequence: 'asc' } },
      },
    });

    return res.status(201).json({ success: true, route });
  } catch (error: any) {
    console.error('Error creating route:', error);
    return res.status(500).json({ error: error.message || 'Failed to create route.' });
  }
});

// PUT /api/admin/routes/:id
router.put('/routes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, routeNumber, boardingPoints } = req.body;
    const collegeId = req.user!.collegeId;

    const existing = await prisma.route.findUnique({ where: { id } });
    if (!existing || existing.collegeId !== collegeId) {
      return res.status(404).json({ error: 'Route not found.' });
    }

    // Update route details
    await prisma.route.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(routeNumber ? { routeNumber: routeNumber.trim().toUpperCase() } : {}),
      },
    });

    // If boarding points provided, replace them with resolved coordinates
    if (Array.isArray(boardingPoints)) {
      const resolvedStops = await resolveBoardingPointsWithCoords(boardingPoints);
      await prisma.boardingPoint.deleteMany({ where: { routeId: id } });
      for (let i = 0; i < resolvedStops.length; i++) {
        const bp = resolvedStops[i];
        await prisma.boardingPoint.create({
          data: {
            name: bp.name,
            latitude: bp.latitude,
            longitude: bp.longitude,
            sequence: bp.sequence || i + 1,
            routeId: id,
          },
        });
      }
    }

    const updated = await prisma.route.findUnique({
      where: { id },
      include: {
        boardingPoints: { orderBy: { sequence: 'asc' } },
        buses: true,
      },
    });

    return res.json({ success: true, route: updated });
  } catch (error: any) {
    console.error('Error updating route:', error);
    return res.status(500).json({ error: error.message || 'Failed to update route.' });
  }
});

// GET /api/admin/students
router.get('/students', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const students = await prisma.student.findMany({
      where: { collegeId },
      include: {
        user: { select: { name: true, phone: true } },
        route: true,
        boardingPoint: true,
      },
      orderBy: { rollNumber: 'asc' },
    });

    return res.json({ success: true, students });
  } catch (error) {
    console.error('Error fetching students:', error);
    return res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// GET /api/admin/trips
router.get('/trips', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;

    const trips = await prisma.trip.findMany({
      where: { collegeId },
      include: {
        bus: { include: { route: true } },
        driver: true,
        notifications: true,
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    });

    return res.json({ success: true, trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return res.status(500).json({ error: 'Failed to fetch trips.' });
  }
});

// PUT /api/admin/college-location - Update college coordinates, reporting cutoff time, and geofence radius
router.put('/college-location', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;
    const { latitude, longitude, address, name, reportingTime, geofenceRadius } = req.body;

    const college = await prisma.college.update({
      where: { id: collegeId },
      data: {
        ...(latitude !== undefined ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude !== undefined ? { longitude: parseFloat(longitude) } : {}),
        ...(address ? { address: address.trim() } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(reportingTime ? { reportingTime: reportingTime.trim() } : {}),
        ...(geofenceRadius !== undefined ? { geofenceRadius: parseFloat(geofenceRadius) } : {}),
      },
    });

    return res.json({ success: true, college });
  } catch (error: any) {
    console.error('Error updating college location:', error);
    return res.status(500).json({ error: error.message || 'Failed to update college location.' });
  }
});

// ==========================================
// BUS ARRIVALS & GEOFENCING REPORTING ROUTES
// ==========================================

// GET /api/admin/arrivals - Filtered historical arrivals
router.get('/arrivals', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;
    const { date, startDate, endDate, status, busId, routeId, search } = req.query;

    const whereClause: any = { collegeId };

    if (date) {
      whereClause.date = String(date);
    } else if (startDate && endDate) {
      whereClause.date = {
        gte: String(startDate),
        lte: String(endDate),
      };
    }

    if (status && status !== 'ALL') {
      whereClause.status = String(status);
    }

    if (busId && busId !== 'ALL') {
      whereClause.busId = String(busId);
    }

    if (routeId && routeId !== 'ALL') {
      whereClause.routeId = String(routeId);
    }

    const arrivals = await prisma.busArrival.findMany({
      where: whereClause,
      include: {
        bus: {
          include: { route: true },
        },
        driver: {
          include: { user: { select: { phone: true, email: true } } },
        },
      },
      orderBy: { arrivalTime: 'desc' },
    });

    let filtered = arrivals;
    if (search) {
      const q = String(search).toLowerCase();
      filtered = arrivals.filter(
        (a) =>
          a.bus.busNumber.toLowerCase().includes(q) ||
          a.driver.driverName.toLowerCase().includes(q) ||
          (a.bus.route?.name && a.bus.route.name.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, arrivals: filtered });
  } catch (error: any) {
    console.error('Error fetching arrivals:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch arrivals.' });
  }
});

// GET /api/admin/arrivals/analytics - Aggregated KPIs and performance rankings
router.get('/arrivals/analytics', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;
    const { date, month, year } = req.query;

    const todayStr = (date as string) || new Date().toISOString().split('T')[0];
    const currentYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const currentMonth = month
      ? parseInt(month as string, 10)
      : new Date().getMonth() + 1;
    const monthPrefix = `${currentYear}-${currentMonth < 10 ? '0' + currentMonth : currentMonth}`;

    const [todayArrivals, monthArrivals, activeTrips, college] = await Promise.all([
      prisma.busArrival.findMany({
        where: { collegeId, date: todayStr },
        include: { bus: { include: { route: true } }, driver: true },
      }),
      prisma.busArrival.findMany({
        where: { collegeId, date: { startsWith: monthPrefix } },
        include: { bus: { include: { route: true } }, driver: true },
      }),
      prisma.trip.findMany({
        where: { collegeId, status: 'ACTIVE' },
        include: {
          bus: { include: { liveLocation: true, route: true } },
          driver: true,
        },
      }),
      prisma.college.findUnique({
        where: { id: collegeId },
        select: { reportingTime: true, geofenceRadius: true, latitude: true, longitude: true },
      }),
    ]);

    // Today's KPIs
    const todayTotal = todayArrivals.length;
    const todayOnTime = todayArrivals.filter((a) => a.status === 'ON_TIME').length;
    const todayDelayed = todayArrivals.filter((a) => a.status === 'DELAYED').length;
    const todayOnTimePct = todayTotal > 0 ? Math.round((todayOnTime / todayTotal) * 100) : 100;
    const todayTotalDelay = todayArrivals.reduce((acc, a) => acc + a.delayMinutes, 0);
    const todayAvgDelay = todayDelayed > 0 ? Math.round(todayTotalDelay / todayDelayed) : 0;

    // Month's KPIs
    const monthTotal = monthArrivals.length;
    const monthOnTime = monthArrivals.filter((a) => a.status === 'ON_TIME').length;
    const monthDelayed = monthArrivals.filter((a) => a.status === 'DELAYED').length;
    const monthOnTimePct = monthTotal > 0 ? Math.round((monthOnTime / monthTotal) * 100) : 100;

    // Driver performance rankings
    const driverStatsMap = new Map<string, { driverName: string; total: number; onTime: number; delayed: number; totalDelay: number }>();
    monthArrivals.forEach((a) => {
      const id = a.driverId;
      if (!driverStatsMap.has(id)) {
        driverStatsMap.set(id, {
          driverName: a.driver.driverName,
          total: 0,
          onTime: 0,
          delayed: 0,
          totalDelay: 0,
        });
      }
      const st = driverStatsMap.get(id)!;
      st.total += 1;
      if (a.status === 'ON_TIME') st.onTime += 1;
      else {
        st.delayed += 1;
        st.totalDelay += a.delayMinutes;
      }
    });

    const driverRankings = Array.from(driverStatsMap.values()).map((st) => ({
      ...st,
      onTimePct: st.total > 0 ? Math.round((st.onTime / st.total) * 100) : 0,
      avgDelay: st.delayed > 0 ? Math.round(st.totalDelay / st.delayed) : 0,
    })).sort((a, b) => b.onTimePct - a.onTimePct);

    // Route rankings
    const routeStatsMap = new Map<string, { routeName: string; total: number; onTime: number; delayed: number }>();
    monthArrivals.forEach((a) => {
      const rName = a.bus.route?.name || 'General Route';
      if (!routeStatsMap.has(rName)) {
        routeStatsMap.set(rName, {
          routeName: rName,
          total: 0,
          onTime: 0,
          delayed: 0,
        });
      }
      const st = routeStatsMap.get(rName)!;
      st.total += 1;
      if (a.status === 'ON_TIME') st.onTime += 1;
      else st.delayed += 1;
    });

    const routeRankings = Array.from(routeStatsMap.values()).map((st) => ({
      ...st,
      onTimePct: st.total > 0 ? Math.round((st.onTime / st.total) * 100) : 0,
    })).sort((a, b) => b.onTimePct - a.onTimePct);

    return res.json({
      success: true,
      today: {
        date: todayStr,
        totalArrivals: todayTotal,
        onTimeCount: todayOnTime,
        delayedCount: todayDelayed,
        onTimePercentage: todayOnTimePct,
        avgDelayMinutes: todayAvgDelay,
        arrivals: todayArrivals,
      },
      month: {
        period: monthPrefix,
        totalArrivals: monthTotal,
        onTimeCount: monthOnTime,
        delayedCount: monthDelayed,
        onTimePercentage: monthOnTimePct,
      },
      rankings: {
        drivers: driverRankings,
        routes: routeRankings,
      },
      activeEnrouteTripsCount: activeTrips.length,
      settings: college,
    });
  } catch (error: any) {
    console.error('Error fetching arrival analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch arrival analytics.' });
  }
});

// GET /api/admin/arrivals/export/daily - 1-Click Excel export of daily arrivals
router.get('/arrivals/export/daily', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const { generateDailyArrivalsExcel } = await import('../services/excelReport.service');
    const buffer = await generateDailyArrivalsExcel(collegeId, dateStr);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Daily_Bus_Arrivals_${dateStr}.xlsx"`
    );
    return res.send(buffer);
  } catch (error: any) {
    console.error('Error exporting daily arrivals excel:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Daily Excel report.' });
  }
});

// GET /api/admin/arrivals/export/delayed - 1-Click Excel export of delayed buses
router.get('/arrivals/export/delayed', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const { generateDelayedBusesExcel } = await import('../services/excelReport.service');
    const buffer = await generateDelayedBusesExcel(collegeId, dateStr);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Delayed_Buses_Report_${dateStr}.xlsx"`
    );
    return res.send(buffer);
  } catch (error: any) {
    console.error('Error exporting delayed buses excel:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Delayed report.' });
  }
});

// GET /api/admin/arrivals/export/monthly - 1-Click Excel export of monthly performance
router.get('/arrivals/export/monthly', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const month = req.query.month
      ? parseInt(req.query.month as string, 10)
      : new Date().getMonth() + 1;

    const { generateMonthlyPerformanceExcel } = await import('../services/excelReport.service');
    const buffer = await generateMonthlyPerformanceExcel(collegeId, year, month);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Monthly_Bus_Performance_${year}_${month < 10 ? '0' + month : month}.xlsx"`
    );
    return res.send(buffer);
  } catch (error: any) {
    console.error('Error exporting monthly performance excel:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Monthly report.' });
  }
});

// POST /api/admin/arrivals/simulate - Test simulator to test gate arrival detection & delay logging
router.post('/arrivals/simulate', async (req: Request, res: Response) => {
  try {
    const collegeId = req.user!.collegeId;
    const { busId, status = 'ON_TIME', delayMinutes = 0, arrivalTime, date } = req.body;

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: { assignedDriver: true, route: true },
    });

    if (!bus || bus.collegeId !== collegeId) {
      return res.status(404).json({ error: 'Bus not found in your college.' });
    }

    const driver = bus.assignedDriver || (await prisma.driver.findFirst({ where: { collegeId } }));
    if (!driver) {
      return res.status(400).json({ error: 'No driver available for this simulation.' });
    }

    const college = await prisma.college.findUnique({ where: { id: collegeId } });
    const reportingTime = college?.reportingTime || '09:00';
    const dateStr = date || new Date().toISOString().split('T')[0];
    const arrivalDate = arrivalTime ? new Date(arrivalTime) : new Date();

    // Find or create trip for simulation
    let trip = await prisma.trip.findFirst({
      where: { busId: bus.id, collegeId },
      orderBy: { createdAt: 'desc' },
    });

    if (!trip || trip.status === 'COMPLETED') {
      trip = await prisma.trip.create({
        data: {
          busId: bus.id,
          driverId: driver.id,
          collegeId,
          status: 'COMPLETED',
          arrivalTime: arrivalDate,
          arrivalStatus: status,
          delayMinutes: parseInt(delayMinutes, 10) || 0,
        },
      });
    }

    const arrival = await prisma.busArrival.upsert({
      where: { tripId: trip.id },
      create: {
        tripId: trip.id,
        busId: bus.id,
        driverId: driver.id,
        collegeId,
        routeId: bus.routeId,
        date: dateStr,
        arrivalTime: arrivalDate,
        reportingTime,
        status: status === 'DELAYED' ? 'DELAYED' : 'ON_TIME',
        delayMinutes: parseInt(delayMinutes, 10) || 0,
        distanceAtArrival: 35.0,
      },
      update: {
        arrivalTime: arrivalDate,
        status: status === 'DELAYED' ? 'DELAYED' : 'ON_TIME',
        delayMinutes: parseInt(delayMinutes, 10) || 0,
      },
    });

    return res.json({ success: true, arrival, message: 'Simulation arrival logged successfully!' });
  } catch (error: any) {
    console.error('Error simulating arrival:', error);
    return res.status(500).json({ error: error.message || 'Failed to simulate arrival.' });
  }
});

export default router;

