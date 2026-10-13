import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';

export async function bootstrapDatabase() {
  try {
    console.log('🔄 Checking database initial state and corridors...');

    // 1. Ensure Default College exists
    let college = await prisma.college.findFirst({
      where: { code: 'SRGEC' },
    });

    if (!college) {
      console.log('🌱 Creating SRGEC college record...');
      college = await prisma.college.create({
        data: {
          name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)',
          code: 'SRGEC',
          latitude: 16.35068,
          longitude: 81.04273,
          address: 'Gudlavalleru, Krishna District, Andhra Pradesh - 521356',
          reportingTime: '09:00',
        },
      });
    }

    // 2. Define the 3 Official Transit Corridors
    const officialRoutes = [
      {
        name: 'gudivada',
        routeNumber: 'ROUTE-01',
        stops: [
          { name: 'gudivada bus stand', latitude: 16.43304, longitude: 80.99369, sequence: 1 },
          { name: 'gudivada ring road', latitude: 16.425, longitude: 80.998, sequence: 2 },
          { name: 'anguluru', latitude: 16.388, longitude: 81.018, sequence: 3 },
          { name: 'SRGEC', latitude: 16.35068, longitude: 81.04273, sequence: 4 },
        ],
        buses: ['001', '2125'],
      },
      {
        name: 'vijayawada',
        routeNumber: 'ROUTE-VR1',
        stops: [
          { name: 'vijayawada bus stand', latitude: 16.5165, longitude: 80.6186, sequence: 1 },
          { name: 'vijayawada benz circle', latitude: 16.4975, longitude: 80.6515, sequence: 2 },
          { name: 'vuyyuru', latitude: 16.3688, longitude: 80.8431, sequence: 3 },
          { name: 'SRGEC', latitude: 16.35068, longitude: 81.04273, sequence: 4 },
        ],
        buses: ['2'],
      },
      {
        name: 'machilipatnam',
        routeNumber: 'ROUTE-MR1',
        stops: [
          { name: 'machilipatnam bus stand', latitude: 16.1875, longitude: 81.1389, sequence: 1 },
          { name: 'chilakalapudi', latitude: 16.205, longitude: 81.125, sequence: 2 },
          { name: 'pedana', latitude: 16.265, longitude: 81.145, sequence: 3 },
          { name: 'kavtharam', latitude: 16.315, longitude: 81.085, sequence: 4 },
          { name: 'SRGEC', latitude: 16.35068, longitude: 81.04273, sequence: 5 },
        ],
        buses: ['1'],
      },
    ];

    const routeMap = new Map<string, any>();
    const stopMap = new Map<string, any>();
    const busMap = new Map<string, any>();

    for (const rData of officialRoutes) {
      let route = await prisma.route.findFirst({
        where: { collegeId: college.id, name: rData.name },
        include: { boardingPoints: true },
      });

      if (!route) {
        route = await prisma.route.create({
          data: {
            name: rData.name,
            routeNumber: rData.routeNumber,
            collegeId: college.id,
          },
          include: { boardingPoints: true },
        });
      }
      routeMap.set(rData.name, route);

      // Ensure stops exist
      for (const sData of rData.stops) {
        let stop = await prisma.boardingPoint.findFirst({
          where: { routeId: route.id, name: sData.name },
        });
        if (!stop) {
          stop = await prisma.boardingPoint.create({
            data: {
              name: sData.name,
              latitude: sData.latitude,
              longitude: sData.longitude,
              sequence: sData.sequence,
              routeId: route.id,
            },
          });
        }
        stopMap.set(`${rData.name}:${sData.name}`, stop);
      }

      // Ensure buses exist and attach route
      for (const bNum of rData.buses) {
        let bus = await prisma.bus.findUnique({
          where: { collegeId_busNumber: { collegeId: college.id, busNumber: bNum } },
        });
        if (!bus) {
          bus = await prisma.bus.create({
            data: {
              busNumber: bNum,
              collegeId: college.id,
              routeId: route.id,
              status: 'INACTIVE',
            },
          });
        } else if (!bus.routeId) {
          bus = await prisma.bus.update({
            where: { id: bus.id },
            data: { routeId: route.id },
          });
        }
        busMap.set(bNum, bus);
      }
    }

    // 3. Ensure Admin account exists (admin@srgec.edu / admin123)
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN', email: 'admin@srgec.edu' },
    });
    if (!existingAdmin) {
      console.log('👤 Seeding default Admin account (admin@srgec.edu / admin123)...');
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

    const defaultPwHash = await bcrypt.hash('123456', 10);

    // 4. Ensure Students exist
    const vijayawadaRoute = routeMap.get('vijayawada');
    const vuyyuruStop = stopMap.get('vijayawada:vuyyuru');
    const vjaBusStandStop = stopMap.get('vijayawada:vijayawada bus stand');

    if (vijayawadaRoute && vuyyuruStop) {
      // Student 1: Nanda
      const studentNanda = await prisma.student.findFirst({
        where: { rollNumber: '24481A05M9' },
      });
      if (!studentNanda) {
        console.log('🎓 Seeding student Nanda (24481A05M9 / 123456)...');
        await prisma.user.create({
          data: {
            name: 'Nanda',
            passwordHash: defaultPwHash,
            role: 'STUDENT',
            collegeId: college.id,
            student: {
              create: {
                rollNumber: '24481A05M9',
                village: 'vuyyuru',
                boardingPointId: vuyyuruStop.id,
                routeId: vijayawadaRoute.id,
                collegeId: college.id,
              },
            },
          },
        });
      }

      // Student 2: chaitanya
      const studentChaitanya = await prisma.student.findFirst({
        where: { rollNumber: '24481A05L3' },
      });
      if (!studentChaitanya && vjaBusStandStop) {
        console.log('🎓 Seeding student chaitanya (24481A05L3 / 123456)...');
        await prisma.user.create({
          data: {
            name: 'chaitanya',
            passwordHash: defaultPwHash,
            role: 'STUDENT',
            collegeId: college.id,
            student: {
              create: {
                rollNumber: '24481A05L3',
                village: 'vijayawada',
                boardingPointId: vjaBusStandStop.id,
                routeId: vijayawadaRoute.id,
                collegeId: college.id,
              },
            },
          },
        });
      }
    }

    // 5. Ensure Drivers exist
    const driversToSeed = [
      { name: 'Ramesh', phone: '7036349676', busNumber: '1' },
      { name: 'sundar', phone: '9398461246', busNumber: '2' },
      { name: 'suresh', phone: '7036349676', busNumber: '2125' },
      { name: 'shiva', phone: '1236547794', busNumber: '001' },
    ];

    for (const d of driversToSeed) {
      const existing = await prisma.driver.findFirst({
        where: { driverName: d.name },
      });
      const busObj = busMap.get(d.busNumber);

      if (!existing) {
        console.log(`🚌 Seeding driver ${d.name} (${d.phone} / 123456)...`);
        const user = await prisma.user.create({
          data: {
            name: d.name,
            phone: d.phone,
            passwordHash: defaultPwHash,
            role: 'DRIVER',
            collegeId: college.id,
            driver: {
              create: {
                driverName: d.name,
                phone: d.phone,
                collegeId: college.id,
                assignedBusId: busObj ? busObj.id : null,
                approvalStatus: 'APPROVED',
                status: 'AVAILABLE',
              },
            },
          },
          include: { driver: true },
        });

        if (busObj && user.driver) {
          await prisma.bus.update({
            where: { id: busObj.id },
            data: { assignedDriverId: user.driver.id },
          });
        }
      }
    }

    console.log('✅ All routes, stops, buses, and credentials verified and synchronized.');
  } catch (error) {
    console.error('⚠️ Database bootstrap warning:', error);
  }
}
