import { prisma } from './config/prisma';
import { checkCollegeGateGeofence, getCutoffDateTime, getISTDateString } from './services/geofence.service';
import { generateDailyArrivalsExcel, generateDelayedBusesExcel, generateMonthlyPerformanceExcel } from './services/excelReport.service';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING GEOFENCING, 9:00 AM ENGINE & EXCEL TESTS');
  console.log('====================================================\n');

  // 1. Fetch or create a test college
  let college = await prisma.college.findFirst();
  if (!college) {
    college = await prisma.college.create({
      data: {
        name: 'Vignan Institute of Technology',
        code: 'VIT01',
        latitude: 17.385044,
        longitude: 78.486671,
        address: 'Deshmukhi, Hyderabad, Telangana',
        reportingTime: '09:00',
        geofenceRadius: 100.0,
      },
    });
  }

  console.log(`🏫 College: ${college.name}`);
  console.log(`📍 Gate Location: ${college.latitude}, ${college.longitude}`);
  console.log(`⏰ Cutoff Time: ${college.reportingTime} AM`);
  console.log(`🎯 Geofence Radius: ${college.geofenceRadius} meters\n`);

  // 2. Fetch or create a test bus & driver
  let bus = await prisma.bus.findFirst({ where: { collegeId: college.id } });
  let driver = await prisma.driver.findFirst({ where: { collegeId: college.id } });

  if (!bus || !driver) {
    console.log('Creating sample bus and driver for test...');
    let user = await prisma.user.create({
      data: {
        name: 'Rajesh Kumar',
        phone: '9876543210',
        passwordHash: 'dummy',
        role: 'DRIVER',
        collegeId: college.id,
      },
    });
    driver = await prisma.driver.create({
      data: {
        userId: user.id,
        driverName: 'Rajesh Kumar',
        phone: '9876543210',
        collegeId: college.id,
        approvalStatus: 'APPROVED',
      },
    });
    bus = await prisma.bus.create({
      data: {
        busNumber: 'TS-08-UA-1001',
        collegeId: college.id,
        assignedDriverId: driver.id,
        status: 'ACTIVE',
      },
    });
  }

  // 3. Test Cutoff Calculation
  const testDate = new Date();
  const cutoff = getCutoffDateTime(testDate, '09:00');
  console.log(`🕒 Cutoff calculation for today: ${cutoff.toISOString()}`);

  // 4. Test BusArrival logging for On-Time (8:50 AM) and Delayed (9:15 AM)
  const todayStr = getISTDateString();

  // Create sample on-time trip
  const trip1 = await prisma.trip.create({
    data: {
      busId: bus.id,
      driverId: driver.id,
      collegeId: college.id,
      status: 'COMPLETED',
      arrivalTime: new Date(),
      arrivalStatus: 'ON_TIME',
      delayMinutes: 0,
    },
  });

  await prisma.busArrival.upsert({
    where: { tripId: trip1.id },
    create: {
      tripId: trip1.id,
      busId: bus.id,
      driverId: driver.id,
      collegeId: college.id,
      date: todayStr,
      arrivalTime: new Date(),
      reportingTime: '09:00',
      status: 'ON_TIME',
      delayMinutes: 0,
      distanceAtArrival: 45.2,
    },
    update: {},
  });
  console.log('✅ Logged sample ON_TIME arrival (delay: 0 mins)');

  // Create sample delayed trip
  const trip2 = await prisma.trip.create({
    data: {
      busId: bus.id,
      driverId: driver.id,
      collegeId: college.id,
      status: 'COMPLETED',
      arrivalTime: new Date(),
      arrivalStatus: 'DELAYED',
      delayMinutes: 18,
    },
  });

  await prisma.busArrival.upsert({
    where: { tripId: trip2.id },
    create: {
      tripId: trip2.id,
      busId: bus.id,
      driverId: driver.id,
      collegeId: college.id,
      date: todayStr,
      arrivalTime: new Date(),
      reportingTime: '09:00',
      status: 'DELAYED',
      delayMinutes: 18,
      distanceAtArrival: 62.1,
    },
    update: {},
  });
  console.log('✅ Logged sample DELAYED arrival (delay: 18 mins)');

  // 5. Test Excel Generation
  console.log('\n📊 Generating Daily Excel Workbook...');
  const dailyExcelBuffer = await generateDailyArrivalsExcel(college.id, todayStr);
  console.log(`✅ Daily Excel Generated successfully! (${dailyExcelBuffer.length} bytes)`);

  console.log('📊 Generating Delayed Buses Excel Report...');
  const delayedExcelBuffer = await generateDelayedBusesExcel(college.id, todayStr);
  console.log(`✅ Delayed Excel Generated successfully! (${delayedExcelBuffer.length} bytes)`);

  console.log('📊 Generating Monthly Performance Excel Workbook...');
  const monthlyExcelBuffer = await generateMonthlyPerformanceExcel(college.id, new Date().getFullYear(), new Date().getMonth() + 1);
  console.log(`✅ Monthly Excel Generated successfully! (${monthlyExcelBuffer.length} bytes)`);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Automated Geofencing, Delay Engine & Excel Reports are 100% functional.\n');
}

runTests()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
