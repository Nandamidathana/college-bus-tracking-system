import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';

export async function bootstrapDatabase() {
  try {
    console.log('🔄 Checking database initial state...');

    // 1. Ensure Default College exists
    let college = await prisma.college.findFirst({
      where: { code: 'SRGEC' },
      include: { routes: { include: { boardingPoints: true } }, buses: true },
    });

    if (!college) {
      console.log('🌱 Creating default SRGEC college record...');
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
            include: { boardingPoints: true },
          },
          buses: true,
        },
      });
    }

    const defaultRoute = college.routes[0];
    const defaultBoarding = defaultRoute?.boardingPoints[0];
    const defaultBus = college.buses[0];

    // 2. Ensure Admin account exists (admin@srgec.edu / admin123)
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@srgec.edu' },
    });

    if (!existingAdmin) {
      console.log('👤 Creating default Admin account (admin@srgec.edu / admin123)...');
      const adminHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          name: 'SRGEC Admin',
          email: 'admin@srgec.edu',
          passwordHash: adminHash,
          role: 'ADMIN',
          collegeId: college.id,
        },
      });
    }

    // 3. Ensure Default Student exists (24481A05M9 / 123456)
    const existingStudent = await prisma.student.findFirst({
      where: { rollNumber: '24481A05M9' },
    });

    if (!existingStudent && defaultRoute && defaultBoarding) {
      console.log('🎓 Creating default Student account (24481A05M9 / 123456)...');
      const studentHash = await bcrypt.hash('123456', 10);
      await prisma.user.create({
        data: {
          name: 'Nanda',
          passwordHash: studentHash,
          role: 'STUDENT',
          collegeId: college.id,
          student: {
            create: {
              rollNumber: '24481A05M9',
              village: 'Gudivada',
              boardingPointId: defaultBoarding.id,
              routeId: defaultRoute.id,
              collegeId: college.id,
            },
          },
        },
      });
    }

    // 4. Ensure Default Driver exists (Ramesh / 7036349676 / 123456)
    const existingDriver = await prisma.driver.findFirst({
      where: { driverName: 'Ramesh' },
    });

    if (!existingDriver) {
      console.log('🚌 Creating default Driver account (Ramesh / 7036349676 / 123456)...');
      const driverHash = await bcrypt.hash('123456', 10);
      const driverUser = await prisma.user.create({
        data: {
          name: 'Ramesh',
          phone: '7036349676',
          passwordHash: driverHash,
          role: 'DRIVER',
          collegeId: college.id,
          driver: {
            create: {
              driverName: 'Ramesh',
              phone: '7036349676',
              collegeId: college.id,
              assignedBusId: defaultBus ? defaultBus.id : null,
              approvalStatus: 'APPROVED',
              status: 'AVAILABLE',
            },
          },
        },
        include: { driver: true },
      });

      if (defaultBus && driverUser.driver) {
        await prisma.bus.update({
          where: { id: defaultBus.id },
          data: { assignedDriverId: driverUser.driver.id },
        });
      }
    }

    console.log('✅ Database bootstrap check completed successfully.');
  } catch (error) {
    console.error('⚠️ Database bootstrap warning:', error);
  }
}
