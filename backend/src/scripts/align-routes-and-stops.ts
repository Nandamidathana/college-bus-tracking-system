import { prisma } from '../config/prisma';

async function main() {
  console.log('🔄 Starting Route and Stops Alignment...');

  const college = await prisma.college.findFirst({
    where: { code: 'SRGEC' },
    include: { routes: { include: { boardingPoints: true, buses: true } } },
  });

  if (!college) {
    console.error('College SRGEC not found');
    return;
  }

  // Define the strict official stops for each route
  const OFFICIAL_ROUTES = [
    {
      name: 'gudivada',
      routeNumber: '01',
      stops: [
        { name: 'gudivada bus stand', latitude: 16.4321, longitude: 80.9976, sequence: 1 },
        { name: 'gudivada ring road', latitude: 16.4278, longitude: 80.9992, sequence: 2 },
        { name: 'anguluru', latitude: 16.3885, longitude: 81.0255, sequence: 3 },
        { name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)', latitude: 16.35068, longitude: 81.04273, sequence: 4 },
      ],
    },
    {
      name: 'vijayawada',
      routeNumber: 'VR1',
      stops: [
        { name: 'vijayawada bus stand', latitude: 16.5165, longitude: 80.6186, sequence: 1 },
        { name: 'vijayawada benz circle', latitude: 16.4975, longitude: 80.6515, sequence: 2 },
        { name: 'vuyyuru', latitude: 16.3688, longitude: 80.8431, sequence: 3 },
        { name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)', latitude: 16.35068, longitude: 81.04273, sequence: 4 },
      ],
    },
    {
      name: 'machilipatnam',
      routeNumber: 'MR1',
      stops: [
        { name: 'machilipatnam bus stand', latitude: 16.1875, longitude: 81.1389, sequence: 1 },
        { name: 'chilakalapudi', latitude: 16.1963, longitude: 81.1491, sequence: 2 },
        { name: 'pedana', latitude: 16.2628, longitude: 81.1444, sequence: 3 },
        { name: 'kavtharam', latitude: 16.3347, longitude: 81.0872, sequence: 4 },
        { name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)', latitude: 16.35068, longitude: 81.04273, sequence: 5 },
      ],
    },
  ];

  for (const rDef of OFFICIAL_ROUTES) {
    let route = await prisma.route.findFirst({
      where: { collegeId: college.id, name: { contains: rDef.name } },
    });

    if (!route) {
      route = await prisma.route.create({
        data: {
          name: rDef.name,
          routeNumber: rDef.routeNumber,
          collegeId: college.id,
        },
      });
    } else {
      await prisma.route.update({
        where: { id: route.id },
        data: { name: rDef.name, routeNumber: rDef.routeNumber },
      });
    }

    // Delete existing boarding points and recreate clean official stops
    await prisma.boardingPoint.deleteMany({
      where: { routeId: route.id },
    });

    for (const st of rDef.stops) {
      await prisma.boardingPoint.create({
        data: {
          name: st.name,
          latitude: st.latitude,
          longitude: st.longitude,
          sequence: st.sequence,
          routeId: route.id,
        },
      });
    }
    console.log(`  ✅ Realigned Route "${rDef.name}" with ${rDef.stops.length} official stops.`);
  }

  // Re-fetch all routes with fresh boarding points
  const allRoutes = await prisma.route.findMany({
    where: { collegeId: college.id },
    include: { boardingPoints: true, buses: true },
  });

  const vjaRoute = allRoutes.find(r => r.name.toLowerCase().includes('vijayawada'))!;
  const gdvRoute = allRoutes.find(r => r.name.toLowerCase().includes('gudivada'))!;
  const mtpRoute = allRoutes.find(r => r.name.toLowerCase().includes('machilipatnam'))!;

  const vuyyuruStop = vjaRoute.boardingPoints.find(bp => bp.name.toLowerCase().includes('vuyyuru'))!;
  const gdvStop = gdvRoute.boardingPoints.find(bp => bp.name.toLowerCase().includes('gudivada'))!;
  const mtpStop = mtpRoute.boardingPoints.find(bp => bp.name.toLowerCase().includes('machilipatnam'))!;

  // Align Students
  const students = await prisma.student.findMany({
    include: { boardingPoint: true, user: true },
  });

  for (const st of students) {
    const bpName = (st.boardingPoint?.name || st.village || '').toLowerCase();
    if (bpName.includes('vuyyuru') || bpName.includes('vijayawada') || bpName.includes('benz')) {
      await prisma.student.update({
        where: { id: st.id },
        data: {
          village: 'Vuyyuru',
          routeId: vjaRoute.id,
          boardingPointId: vuyyuruStop.id,
        },
      });
      console.log(`  🎓 Synced Student "${st.user?.name || st.rollNumber}" -> Vijayawada Route (Vuyyuru Stop: ${vuyyuruStop.id})`);
    } else if (bpName.includes('machilipatnam') || bpName.includes('chilakalapudi') || bpName.includes('pedana') || bpName.includes('kavtharam')) {
      await prisma.student.update({
        where: { id: st.id },
        data: {
          village: 'Machilipatnam',
          routeId: mtpRoute.id,
          boardingPointId: mtpStop.id,
        },
      });
      console.log(`  🎓 Synced Student "${st.user?.name || st.rollNumber}" -> Machilipatnam Route`);
    } else {
      await prisma.student.update({
        where: { id: st.id },
        data: {
          village: 'Gudivada',
          routeId: gdvRoute.id,
          boardingPointId: gdvStop.id,
        },
      });
      console.log(`  🎓 Synced Student "${st.user?.name || st.rollNumber}" -> Gudivada Route`);
    }
  }

  // Ensure Buses are assigned to correct routes
  // Bus 2 -> Vijayawada
  // Bus 001, 2125 -> Gudivada
  // Bus 1 -> Machilipatnam
  const buses = await prisma.bus.findMany();
  for (const b of buses) {
    if (b.busNumber === '2') {
      await prisma.bus.update({ where: { id: b.id }, data: { routeId: vjaRoute.id } });
      console.log(`  🚌 Bus 2 -> Assigned to Vijayawada Route`);
    } else if (b.busNumber === '001' || b.busNumber === '2125' || b.busNumber === 'AP16AB1001') {
      await prisma.bus.update({ where: { id: b.id }, data: { routeId: gdvRoute.id } });
      console.log(`  🚌 Bus ${b.busNumber} -> Assigned to Gudivada Route`);
    } else if (b.busNumber === '1') {
      await prisma.bus.update({ where: { id: b.id }, data: { routeId: mtpRoute.id } });
      console.log(`  🚌 Bus 1 -> Assigned to Machilipatnam Route`);
    }
  }

  console.log('\n🎉 Routes and stops alignment complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
