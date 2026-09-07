import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { generateToken } from '../middleware/auth';
import { geocodeLocation } from '../services/geocoding.service';
import { extractDistinctiveTokens } from '../utils/routeMatching';
import { calculateDistanceMeters } from '../utils/haversine';

const router = Router();

// Helper: Get or Auto-Seed Default College
async function getOrCreateDefaultCollege() {
  let college = await prisma.college.findFirst({
    include: {
      routes: {
        include: {
          boardingPoints: { orderBy: { sequence: 'asc' } },
        },
      },
      buses: true,
    },
  });

  if (!college) {
    college = await prisma.college.create({
      data: {
        name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)',
        code: 'SRGEC',
        latitude: 16.35068,
        longitude: 81.04273,
        address: 'Gudlavalleru, Krishna District, Andhra Pradesh - 521356',
        reportingTime: '09:00',
        routes: {
          create: [
            {
              name: 'Campus Express Route 1',
              routeNumber: 'ROUTE-01',
              boardingPoints: {
                create: [
                  { name: 'Gudivada Bus Stand', latitude: 16.43304, longitude: 80.99369, sequence: 1 },
                  { name: 'SRGEC Main Campus', latitude: 16.35068, longitude: 81.04273, sequence: 2 },
                ],
              },
            },
          ],
        },
        buses: {
          create: [
            { busNumber: 'AP16AB1001', status: 'INACTIVE' },
          ],
        },
      },
      include: {
        routes: {
          include: {
            boardingPoints: { orderBy: { sequence: 'asc' } },
          },
        },
        buses: true,
      },
    });
  }
  return college;
}

// GET /api/auth/colleges - Public endpoint for college selection
router.get('/colleges', async (_req: Request, res: Response) => {
  try {
    let colleges = await prisma.college.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        latitude: true,
        longitude: true,
        address: true,
        routes: {
          select: {
            id: true,
            name: true,
            routeNumber: true,
            boardingPoints: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                sequence: true,
              },
              orderBy: { sequence: 'asc' },
            },
          },
        },
        buses: {
          select: {
            id: true,
            busNumber: true,
            status: true,
          },
        },
      },
    });

    if (!colleges || colleges.length === 0) {
      const defaultCol = await getOrCreateDefaultCollege();
      colleges = [defaultCol as any];
    }

    return res.json({ success: true, colleges });
  } catch (error) {
    console.error('Error fetching colleges:', error);
    return res.status(500).json({ error: 'Failed to retrieve colleges.' });
  }
});

// POST /api/auth/colleges/create - Register a new college with live GPS location
router.post('/colleges/create', async (req: Request, res: Response) => {
  try {
    const { name, code, latitude, longitude, address } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'College name, latitude, and longitude are required.' });
    }

    const cleanCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)).toUpperCase();

    // Check if code already exists
    let finalCode = cleanCode;
    const existing = await prisma.college.findUnique({ where: { code: finalCode } });
    if (existing) {
      finalCode = `${cleanCode}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const college = await prisma.college.create({
      data: {
        name: name.trim(),
        code: finalCode,
        latitude: parseFloat(String(latitude)),
        longitude: parseFloat(String(longitude)),
        address: address ? address.trim() : `${name.trim()} Campus`,
        routes: {
          create: {
            name: `${name.trim()} Main Route`,
            routeNumber: 'ROUTE-01',
            boardingPoints: {
              create: [
                {
                  name: 'Main Campus Gate',
                  latitude: parseFloat(String(latitude)),
                  longitude: parseFloat(String(longitude)),
                  sequence: 1,
                },
              ],
            },
          },
        },
      },
      include: {
        routes: {
          include: { boardingPoints: true },
        },
      },
    });

    return res.status(201).json({ success: true, college });
  } catch (error: any) {
    console.error('Error creating college:', error);
    return res.status(500).json({ error: error.message || 'Failed to create college.' });
  }
});

// POST /api/auth/student/register
router.post('/student/register', async (req: Request, res: Response) => {
  try {
    const {
      name,
      collegeId,
      newCollegeName,
      collegeLatitude,
      collegeLongitude,
      rollNumber,
      village,
      boardingPointName,
      latitude,
      longitude,
      boardingPointId,
      routeId,
      password,
    } = req.body;

    if (!name || (!collegeId && !newCollegeName) || !rollNumber || !password) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    let finalCollegeId = collegeId;

    // If student is registering with a new custom college with live GPS location
    if (!finalCollegeId && newCollegeName) {
      const cleanCode = newCollegeName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() + '_' + Math.floor(100 + Math.random() * 900);
      const geocodedCol = await geocodeLocation(newCollegeName.trim());
      const colLat = collegeLatitude !== undefined && !isNaN(parseFloat(String(collegeLatitude)))
        ? parseFloat(String(collegeLatitude))
        : (geocodedCol?.latitude || 16.35068);
      const colLng = collegeLongitude !== undefined && !isNaN(parseFloat(String(collegeLongitude)))
        ? parseFloat(String(collegeLongitude))
        : (geocodedCol?.longitude || 81.04273);

      const newCollege = await prisma.college.create({
        data: {
          name: newCollegeName.trim(),
          code: cleanCode,
          latitude: colLat,
          longitude: colLng,
          address: geocodedCol?.address || `${newCollegeName.trim()} Campus`,
          routes: {
            create: {
              name: `${newCollegeName.trim()} Route 1`,
              routeNumber: 'ROUTE-01',
              boardingPoints: {
                create: [
                  {
                    name: boardingPointName ? boardingPointName.trim() : 'Pickup Point',
                    latitude: parseFloat(String(latitude || colLat)),
                    longitude: parseFloat(String(longitude || colLng)),
                    sequence: 1,
                  },
                ],
              },
            },
          },
        },
        include: { routes: { include: { boardingPoints: true } } },
      });

      finalCollegeId = newCollege.id;
    }

    // Verify college exists or fallback to default
    let college = finalCollegeId
      ? await prisma.college.findUnique({
          where: { id: finalCollegeId },
          include: { routes: { include: { boardingPoints: true } } },
        })
      : null;

    if (!college) {
      college = await getOrCreateDefaultCollege();
      finalCollegeId = college.id;
    }

    // Check if roll number already registered
    const cleanRoll = rollNumber.trim().toUpperCase();
    const existingStudent = await prisma.student.findFirst({
      where: {
        rollNumber: cleanRoll,
      },
    });

    if (existingStudent) {
      return res.status(400).json({
        error: `Roll Number '${cleanRoll}' is already registered. Please Sign In or use Forgot PIN.`,
      });
    }

    const bpName = boardingPointName ? boardingPointName.trim() : (village ? village.trim() : 'My Boarding Stop');
    let bpLat = latitude !== undefined && !isNaN(parseFloat(String(latitude))) ? parseFloat(String(latitude)) : 0;
    let bpLng = longitude !== undefined && !isNaN(parseFloat(String(longitude))) ? parseFloat(String(longitude)) : 0;

    if ((bpLat === 0 || bpLng === 0 || (bpLat === 16.35 && bpLng === 80.62) || (bpLat === 16.355 && bpLng === 80.625)) && bpName) {
      const geocoded = await geocodeLocation(bpName);
      if (geocoded) {
        bpLat = geocoded.latitude;
        bpLng = geocoded.longitude;
      } else {
        bpLat = college.latitude || 16.35068;
        bpLng = college.longitude || 81.04273;
      }
    }

    // Match the correct route for this boarding point or village
    let finalRouteId = routeId;
    let finalBoardingPointId = boardingPointId;

    if (college.routes && college.routes.length > 0) {
      const tokens = extractDistinctiveTokens(bpName);
      let matchedRoute = null;
      let matchedStop = null;

      // 1. Direct Stop Name Match
      for (const r of college.routes) {
        for (const s of (r.boardingPoints || [])) {
          const sTokens = extractDistinctiveTokens(s.name);
          if (tokens.length > 0 && sTokens.some((st: string) => tokens.includes(st) || bpName.toLowerCase().includes(st))) {
            matchedRoute = r;
            matchedStop = s;
            break;
          }
        }
        if (matchedRoute) break;
      }

      // 2. Route Name Match
      if (!matchedRoute) {
        for (const r of college.routes) {
          const rTokens = extractDistinctiveTokens(r.name);
          if (tokens.some((t: string) => rTokens.includes(t) || r.name.toLowerCase().includes(t))) {
            matchedRoute = r;
            matchedStop = (r.boardingPoints || [])[0] || null;
            break;
          }
        }
      }

      // 3. Proximity Match
      if (!matchedRoute && bpLat !== 0 && bpLng !== 0) {
        let minDist = Infinity;
        for (const r of college.routes) {
          for (const s of (r.boardingPoints || [])) {
            if (s.name.toLowerCase().includes('college') || s.name.toLowerCase().includes('srgec')) continue;
            const d = calculateDistanceMeters(bpLat, bpLng, s.latitude, s.longitude);
            if (d < minDist) {
              minDist = d;
              matchedRoute = r;
              matchedStop = s;
            }
          }
        }
      }

      if (matchedRoute) {
        finalRouteId = matchedRoute.id;
        if (matchedStop) {
          finalBoardingPointId = matchedStop.id;
        }
      }
    }

    if (!finalRouteId) {
      finalRouteId = college.routes && college.routes.length > 0 ? college.routes[0].id : null;
    }

    // If custom boarding point still needed
    if (!finalBoardingPointId || finalBoardingPointId === 'CUSTOM') {
      const newPoint = await prisma.boardingPoint.create({
        data: {
          name: bpName,
          latitude: bpLat,
          longitude: bpLng,
          routeId: finalRouteId!,
          sequence: 99,
        },
      });
      finalBoardingPointId = newPoint.id;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and student profile
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        passwordHash,
        role: 'STUDENT',
        collegeId: finalCollegeId,
        student: {
          create: {
            rollNumber: rollNumber.trim().toUpperCase(),
            village: village ? village.trim() : 'Campus Area',
            boardingPointId: finalBoardingPointId,
            routeId: finalRouteId,
            collegeId: finalCollegeId,
          },
        },
      },
      include: {
        student: {
          include: {
            boardingPoint: true,
            route: true,
            college: true,
          },
        },
      },
    });

    const token = generateToken({
      userId: user.id,
      name: user.name,
      role: 'STUDENT',
      collegeId: user.collegeId,
      studentId: user.student?.id,
      rollNumber: user.student?.rollNumber,
    });

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        student: user.student,
        college: user.student?.college,
      },
    });
  } catch (error: any) {
    console.error('Student registration error:', error);
    return res.status(500).json({ error: error.message || 'Registration failed.' });
  }
});

// POST /api/auth/student/login
router.post('/student/login', async (req: Request, res: Response) => {
  try {
    const { rollNumber, password, collegeId } = req.body;

    if (!rollNumber || !password) {
      return res.status(400).json({ error: 'Roll Number and Password are required.' });
    }

    const cleanRoll = rollNumber.trim().toLowerCase();

    // Query students and match rollNumber case-insensitively
    const allStudents = await prisma.student.findMany({
      include: {
        user: true,
        college: true,
        route: true,
        boardingPoint: true,
      },
    });

    let student = allStudents.find(
      (s) =>
        (collegeId ? s.collegeId === collegeId : true) &&
        s.rollNumber.toLowerCase() === cleanRoll
    );

    if (!student) {
      student = allStudents.find((s) => s.rollNumber.toLowerCase() === cleanRoll);
    }

    if (!student || !student.user) {
      return res.status(401).json({ error: 'Invalid Roll Number or Password.' });
    }

    const isMatch = await bcrypt.compare(password, student.user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Roll Number or Password.' });
    }

    const token = generateToken({
      userId: student.user.id,
      name: student.user.name,
      role: 'STUDENT',
      collegeId: student.collegeId,
      studentId: student.id,
      rollNumber: student.rollNumber,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: student.user.id,
        name: student.user.name,
        role: student.user.role,
        collegeId: student.collegeId,
        student,
        college: student.college,
      },
    });
  } catch (error: any) {
    console.error('Student login error:', error);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/driver/register
router.post('/driver/register', async (req: Request, res: Response) => {
  try {
    const { driverName, collegeId, newCollegeName, latitude, longitude, busNumber, phone, password } = req.body;

    if (!driverName || (!collegeId && !newCollegeName) || !password) {
      return res.status(400).json({ error: 'Driver name, college, and password are required.' });
    }

    let finalCollegeId = collegeId;

    if (!finalCollegeId && newCollegeName) {
      const cleanCode = newCollegeName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() + '_' + Math.floor(100 + Math.random() * 900);
      const geocodedCol = await geocodeLocation(newCollegeName.trim());
      const colLat = latitude !== undefined && !isNaN(parseFloat(String(latitude))) ? parseFloat(String(latitude)) : (geocodedCol?.latitude || 16.35068);
      const colLng = longitude !== undefined && !isNaN(parseFloat(String(longitude))) ? parseFloat(String(longitude)) : (geocodedCol?.longitude || 81.04273);

      const newCollege = await prisma.college.create({
        data: {
          name: newCollegeName.trim(),
          code: cleanCode,
          latitude: colLat,
          longitude: colLng,
          address: geocodedCol?.address || `${newCollegeName.trim()} Campus`,
        },
      });
      finalCollegeId = newCollege.id;
    }

    let college = finalCollegeId
      ? await prisma.college.findUnique({ where: { id: finalCollegeId } })
      : null;

    if (!college) {
      college = await getOrCreateDefaultCollege();
      finalCollegeId = college.id;
    }

    // Check if phone or driver already exists
    if (phone) {
      const existingUserPhone = await prisma.user.findFirst({
        where: { phone: phone.trim() },
      });
      if (existingUserPhone) {
        return res.status(400).json({
          error: `A driver with phone '${phone.trim()}' is already registered. Please Sign In or use Forgot PIN.`,
        });
      }
    }

    // Find or create bus for this college if busNumber is specified
    let bus = null;
    const cleanBusNumber = (busNumber || 'AP16AB1001').trim().toUpperCase();
    bus = await prisma.bus.findUnique({
      where: {
        collegeId_busNumber: {
          collegeId: finalCollegeId,
          busNumber: cleanBusNumber,
        },
      },
    });

    if (!bus) {
      bus = await prisma.bus.create({
        data: {
          busNumber: cleanBusNumber,
          collegeId: finalCollegeId,
          status: 'INACTIVE',
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name: driverName.trim(),
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: 'DRIVER',
        collegeId: finalCollegeId,
        driver: {
          create: {
            driverName: driverName.trim(),
            phone: phone ? phone.trim() : null,
            collegeId: finalCollegeId,
            assignedBusId: bus ? bus.id : null,
            approvalStatus: 'APPROVED',
            status: 'AVAILABLE',
          },
        },
      },
      include: {
        driver: {
          include: {
            assignedBus: true,
            college: true,
          },
        },
      },
    });

    if (bus && user.driver) {
      await prisma.bus.update({
        where: { id: bus.id },
        data: { assignedDriverId: user.driver.id },
      });
    }

    const token = generateToken({
      userId: user.id,
      name: user.name,
      role: 'DRIVER',
      collegeId: user.collegeId,
      driverId: user.driver?.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Driver registered successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        driver: user.driver,
        college: user.driver?.college,
      },
    });
  } catch (error: any) {
    console.error('Driver registration error:', error);
    return res.status(500).json({ error: error.message || 'Driver registration failed.' });
  }
});

// POST /api/auth/driver/login
router.post('/driver/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password, collegeId } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Driver Name/Phone and Password are required.' });
    }

    const clean = identifier.trim().toLowerCase();

    // Find all driver users and match case-insensitively
    const allDrivers = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
      },
      include: {
        driver: {
          include: {
            assignedBus: true,
            college: true,
          },
        },
      },
    });

    // Try matching by college first, then fallback to global name match
    let matchedUser = allDrivers.find(
      (u) =>
        (collegeId ? u.collegeId === collegeId : true) &&
        (u.name.toLowerCase() === clean ||
          (u.phone && u.phone.toLowerCase() === clean) ||
          (u.email && u.email.toLowerCase() === clean))
    );

    if (!matchedUser) {
      matchedUser = allDrivers.find(
        (u) =>
          u.name.toLowerCase() === clean ||
          (u.phone && u.phone.toLowerCase() === clean) ||
          (u.email && u.email.toLowerCase() === clean)
      );
    }

    if (!matchedUser || !matchedUser.driver) {
      return res.status(401).json({ error: 'Invalid driver credentials. Please check your username or phone number.' });
    }

    const isMatch = await bcrypt.compare(password, matchedUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check and try again.' });
    }

    const token = generateToken({
      userId: matchedUser.id,
      name: matchedUser.name,
      role: 'DRIVER',
      collegeId: matchedUser.collegeId,
      driverId: matchedUser.driver.id,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        role: matchedUser.role,
        collegeId: matchedUser.collegeId,
        driver: matchedUser.driver,
        college: matchedUser.driver.college,
      },
    });
  } catch (error: any) {
    console.error('Driver login error:', error);
    return res.status(500).json({ error: 'Driver login failed.' });
  }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Username and Password are required.' });
    }

    const clean = email.trim().toLowerCase();

    const allAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { college: true },
    });

    const user = allAdmins.find(
      (a) =>
        a.email?.toLowerCase() === clean ||
        a.name.toLowerCase() === clean ||
        a.name.toLowerCase().includes(clean)
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid Admin credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Admin credentials.' });
    }

    const token = generateToken({
      userId: user.id,
      name: user.name,
      role: 'ADMIN',
      collegeId: user.collegeId,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        college: user.college,
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Admin login failed.' });
  }
});

// POST /api/auth/student/recover-pin
router.post('/student/recover-pin', async (req: Request, res: Response) => {
  try {
    const { rollNumber, newPassword, collegeId } = req.body;
    if (!rollNumber || !newPassword) {
      return res.status(400).json({ error: 'Roll Number and New PIN / Password are required.' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New PIN / Password must be at least 4 characters.' });
    }

    const cleanRoll = rollNumber.trim().toLowerCase();
    const allStudents = await prisma.student.findMany({
      include: { user: true },
    });

    const student =
      allStudents.find(
        (s) =>
          (collegeId ? s.collegeId === collegeId : true) &&
          s.rollNumber.toLowerCase() === cleanRoll
      ) || allStudents.find((s) => s.rollNumber.toLowerCase() === cleanRoll);

    if (!student || !student.user) {
      return res.status(404).json({ error: 'No student account found with this Roll Number.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({
      success: true,
      message: `Password/PIN for ${student.rollNumber} has been reset successfully! You can now sign in.`,
    });
  } catch (error: any) {
    console.error('Student PIN recovery error:', error);
    return res.status(500).json({ error: 'Failed to reset PIN/Password.' });
  }
});

// POST /api/auth/driver/recover-pin
router.post('/driver/recover-pin', async (req: Request, res: Response) => {
  try {
    const { identifier, newPassword, collegeId } = req.body;
    if (!identifier || !newPassword) {
      return res.status(400).json({ error: 'Driver Name/Phone and New PIN are required.' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New PIN must be at least 4 characters.' });
    }

    const clean = identifier.trim().toLowerCase();
    const allDrivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      include: { driver: true },
    });

    const matchedUser =
      allDrivers.find(
        (u) =>
          (collegeId ? u.collegeId === collegeId : true) &&
          (u.name.toLowerCase() === clean ||
            (u.phone && u.phone.toLowerCase() === clean) ||
            (u.driver && u.driver.driverName.toLowerCase() === clean) ||
            (u.driver?.phone && u.driver.phone.toLowerCase() === clean))
      ) ||
      allDrivers.find(
        (u) =>
          u.name.toLowerCase() === clean ||
          (u.phone && u.phone.toLowerCase() === clean) ||
          (u.driver && u.driver.driverName.toLowerCase() === clean)
      );

    if (!matchedUser) {
      return res.status(404).json({ error: 'No driver account found with this Name or Phone number.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: matchedUser.id },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({
      success: true,
      message: `PIN for driver ${matchedUser.name} has been reset successfully! You can now sign in.`,
    });
  } catch (error: any) {
    console.error('Driver PIN recovery error:', error);
    return res.status(500).json({ error: 'Failed to reset driver PIN.' });
  }
});

// POST /api/auth/admin/recover-password
router.post('/admin/recover-password', async (req: Request, res: Response) => {
  try {
    const { email, collegeCode, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Admin Email and New Password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New Password must be at least 6 characters.' });
    }

    const clean = email.trim().toLowerCase();
    const allAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { college: true },
    });

    const user = allAdmins.find(
      (a) =>
        a.email?.toLowerCase() === clean ||
        a.name.toLowerCase() === clean ||
        a.name.toLowerCase().includes(clean)
    );

    if (!user) {
      return res.status(404).json({ error: 'No Administrator account found with this email/username.' });
    }

    if (collegeCode && user.college) {
      const cleanCode = collegeCode.trim().toUpperCase();
      if (user.college.code.toUpperCase() !== cleanCode && !user.college.code.toUpperCase().includes(cleanCode)) {
        return res.status(400).json({ error: 'College verification code did not match.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return res.json({
      success: true,
      message: `Administrator password for ${user.name} has been reset successfully!`,
    });
  } catch (error: any) {
    console.error('Admin password recovery error:', error);
    return res.status(500).json({ error: 'Failed to reset admin password.' });
  }
});

export default router;
