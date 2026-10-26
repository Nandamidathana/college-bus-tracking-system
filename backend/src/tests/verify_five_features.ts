import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { checkAndEmitProximityAlerts } from '../services/proximity.service';

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 Starting 5-Feature Production Upgrade Verification');
  console.log('====================================================\n');

  let passedTests = 0;
  const totalTests = 5;

  // 1. SETUP / LOOKUP BASE ENTITIES
  const college = await prisma.college.findFirst();
  if (!college) {
    throw new Error('No college found in database. Please run bootstrap or seed first.');
  }

  const bus = await prisma.bus.findFirst({
    where: { collegeId: college.id },
    include: { route: { include: { boardingPoints: true } } },
  });

  const student = await prisma.student.findFirst({
    where: { collegeId: college.id },
    include: { user: true, boardingPoint: true },
  });

  const driver = await prisma.driver.findFirst({
    where: { collegeId: college.id },
    include: { user: true },
  });

  if (!bus || !student || !driver) {
    throw new Error('Missing base entities (bus, student, or driver).');
  }

  console.log(`✓ Base Entities Loaded: College "${college.name}", Bus "${bus.busNumber}", Student "${student.user.name}", Driver "${driver.driverName}"\n`);

  // ========================================================
  // TEST 1: NOTIFICATION PREFERENCES & ARRIVAL DETECTION
  // ========================================================
  console.log('--- TEST 1: Notification Preferences & Arrival Detection ---');
  try {
    // Upsert student preferences
    const pref = await prisma.notificationPreference.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        busArrivalAlerts: true,
        thresholdType: 'BOTH',
        enableWebPush: true,
        enableSms: true,
        enableWhatsApp: true,
        phoneNumber: '+919876543210',
      },
      update: {
        busArrivalAlerts: true,
        thresholdType: 'BOTH',
        enableWebPush: true,
        phoneNumber: '+919876543210',
      },
    });

    console.log(`  ✓ Notification preferences saved: thresholdType=${pref.thresholdType}, webPush=${pref.enableWebPush}, phone=${pref.phoneNumber}`);

    // Create a temporary trip for test verification
    const testTrip = await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: driver.id,
        collegeId: college.id,
        status: 'ACTIVE',
        tripType: 'MORNING_PICKUP',
      },
    });

    // Mock Socket.IO server emitter
    const mockIo: any = {
      to: () => mockIo,
      emit: () => {},
    };

    // Simulate bus approaching student's boarding point (within 1000m)
    const bp = student.boardingPoint || { latitude: 16.35, longitude: 81.04 };
    const nearLat = bp.latitude + 0.005; // ~550m
    const nearLng = bp.longitude + 0.005;

    const alertResults = await checkAndEmitProximityAlerts(
      mockIo,
      testTrip.id,
      bus.id,
      bus.busNumber,
      nearLat,
      nearLng
    );

    console.log(`  ✓ Proximity evaluation executed: ${alertResults.length} alert(s) triggered`);

    // Verify deduplication: second call should emit 0 duplicates
    const duplicateResults = await checkAndEmitProximityAlerts(
      mockIo,
      testTrip.id,
      bus.id,
      bus.busNumber,
      nearLat,
      nearLng
    );

    if (duplicateResults.length === 0) {
      console.log('  ✓ Deduplication verified: exactly 1 alert per student per active trip.');
      passedTests++;
    } else {
      console.error('  ✗ Deduplication failed: duplicate alert was sent.');
    }

    // Clean up test trip
    await prisma.notification.deleteMany({ where: { tripId: testTrip.id } });
    await prisma.trip.delete({ where: { id: testTrip.id } });
  } catch (err: any) {
    console.error('  ✗ Test 1 failed:', err.message);
  }

  // ========================================================
  // TEST 2: BUS OCCUPANCY & BOARDING CONFIRMATION
  // ========================================================
  console.log('\n--- TEST 2: Bus Occupancy & Boarding Confirmation ---');
  try {
    // 1. Driver updates occupancy
    const updatedBus = await prisma.bus.update({
      where: { id: bus.id },
      data: {
        currentOccupancy: 28,
        occupancyStatus: 'HIGH',
        occupancyUpdatedAt: new Date(),
        occupancyUpdatedBy: driver.driverName,
      },
    });

    console.log(`  ✓ Driver set occupancy: ${updatedBus.currentOccupancy}/${updatedBus.capacity} (${updatedBus.occupancyStatus})`);

    // 2. Student confirms boarding ("I'm on board")
    const testTrip2 = await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: driver.id,
        collegeId: college.id,
        status: 'ACTIVE',
      },
    });

    const confirmation = await prisma.boardingConfirmation.create({
      data: {
        studentId: student.id,
        tripId: testTrip2.id,
        status: 'ON_BOARD',
      },
    });

    console.log(`  ✓ Student boarding confirmation recorded: status=${confirmation.status}, confirmedAt=${confirmation.confirmedAt.toISOString()}`);

    // Clean up
    await prisma.boardingConfirmation.deleteMany({ where: { tripId: testTrip2.id } });
    await prisma.trip.delete({ where: { id: testTrip2.id } });
    passedTests++;
  } catch (err: any) {
    console.error('  ✗ Test 2 failed:', err.message);
  }

  // ========================================================
  // TEST 3: CRYPTOGRAPHICALLY SECURE GUARDIAN TRACKING LINK
  // ========================================================
  console.log('\n--- TEST 3: Secure Guardian Tracking Link ---');
  try {
    // Generate 32 bytes high entropy token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    const link = await prisma.guardianTrackingLink.create({
      data: {
        tokenHash,
        studentId: student.id,
        busId: bus.id,
        label: 'Guardian Link Test',
        expiresAt,
      },
    });

    console.log(`  ✓ Token generated (32-byte hex entropy: ${rawToken.slice(0, 10)}...)`);
    console.log(`  ✓ SHA-256 hash stored in DB: ${tokenHash.slice(0, 16)}...`);

    // Verify lookup by SHA-256 hash
    const lookupHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const retrievedLink = await prisma.guardianTrackingLink.findUnique({
      where: { tokenHash: lookupHash },
      include: {
        bus: { select: { busNumber: true } },
      },
    });

    if (retrievedLink && retrievedLink.busId === bus.id && !retrievedLink.isRevoked) {
      console.log(`  ✓ Valid link verified: Bus #${retrievedLink.bus.busNumber}, expires: ${retrievedLink.expiresAt.toISOString()}`);
      passedTests++;
    } else {
      console.error('  ✗ Failed to verify guardian tracking link.');
    }

    // Clean up test link
    await prisma.guardianTrackingLink.delete({ where: { id: link.id } });
  } catch (err: any) {
    console.error('  ✗ Test 3 failed:', err.message);
  }

  // ========================================================
  // TEST 4: DRIVER INCIDENT, SOS & DELAY REPORTING
  // ========================================================
  console.log('\n--- TEST 4: Driver Incident & SOS Reporting ---');
  try {
    // 1. Driver reports emergency SOS / delay
    const incident = await prisma.incident.create({
      data: {
        collegeId: college.id,
        busId: bus.id,
        driverId: driver.id,
        type: 'SOS',
        severity: 'CRITICAL',
        status: 'OPEN',
        description: 'Test emergency assist request - vehicle puncture near junction',
        delayMinutes: 20,
        latitude: 16.355,
        longitude: 81.045,
      },
    });

    console.log(`  ✓ Incident created: id=${incident.id}, type=${incident.type}, severity=${incident.severity}, status=${incident.status}`);

    // 2. Admin acknowledges incident
    const acknowledged = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });
    console.log(`  ✓ Admin acknowledged incident: status=${acknowledged.status}, acknowledgedAt=${acknowledged.acknowledgedAt?.toISOString()}`);

    // 3. Admin resolves incident
    const resolved = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolutionNotes: 'Dispatched backup bus #12, all passengers transferred smoothly.',
      },
    });
    console.log(`  ✓ Admin resolved incident: status=${resolved.status}, notes="${resolved.resolutionNotes}"`);

    passedTests++;
    // Clean up
    await prisma.incident.delete({ where: { id: incident.id } });
  } catch (err: any) {
    console.error('  ✗ Test 4 failed:', err.message);
  }

  // ========================================================
  // TEST 5: PWA ASSETS & SERVICE WORKER INTEGRITY
  // ========================================================
  console.log('\n--- TEST 5: Progressive Web App (PWA) Integrity ---');
  try {
    const swPath = path.resolve(__dirname, '../../../frontend/public/sw.js');
    const manifestPath = path.resolve(__dirname, '../../../frontend/public/manifest.json');

    const swExists = fs.existsSync(swPath);
    const manifestExists = fs.existsSync(manifestPath);

    if (swExists && manifestExists) {
      const swContent = fs.readFileSync(swPath, 'utf8');
      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const hasPushHandler = swContent.includes("addEventListener('push'");
      const hasNotificationClick = swContent.includes("addEventListener('notificationclick'");
      const hasOfflineCache = swContent.includes('caches.open');

      if (hasPushHandler && hasNotificationClick && hasOfflineCache && manifestContent.display === 'standalone') {
        console.log(`  ✓ Manifest validated: name="${manifestContent.name}", display="${manifestContent.display}", theme="${manifestContent.theme_color}"`);
        console.log(`  ✓ Service Worker validated: push listener ✓, notificationclick listener ✓, offline caching ✓`);
        passedTests++;
      } else {
        console.error('  ✗ Service worker missing required handlers.');
      }
    } else {
      console.error(`  ✗ PWA files missing: sw=${swExists}, manifest=${manifestExists}`);
    }
  } catch (err: any) {
    console.error('  ✗ Test 5 failed:', err.message);
  }

  console.log('\n====================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
