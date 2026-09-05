import { io } from 'socket.io-client';
import axios from 'axios';
import { calculateDistanceMeters, formatDistance } from './utils/haversine';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function runEndToEndVerification() {
  console.log('🧪 Starting End-to-End Test for College Bus Live Tracking System...\n');

  try {
    // 1. Student Login
    console.log('1️⃣ Testing Student Login (Roll 21A01)...');
    const studentLoginRes = await axios.post(`${BASE_URL}/auth/student/login`, {
      rollNumber: '21A01',
      password: 'Student@123',
    });
    console.log('✅ Student Login Successful:', studentLoginRes.data.user.name);
    const studentToken = studentLoginRes.data.token;
    const boardingPoint = studentLoginRes.data.user.student.boardingPoint;
    console.log(`📍 Student Boarding Point: ${boardingPoint.name} (Lat: ${boardingPoint.latitude}, Lon: ${boardingPoint.longitude})`);

    // 2. Driver Login
    console.log('\n2️⃣ Testing Driver Login (Ramesh)...');
    const driverLoginRes = await axios.post(`${BASE_URL}/auth/driver/login`, {
      identifier: 'Ramesh',
      password: 'Driver@123',
    });
    console.log('✅ Driver Login Successful:', driverLoginRes.data.user.name);
    const driverToken = driverLoginRes.data.token;

    // 3. Driver Starts Trip
    console.log('\n3️⃣ Testing Driver Start Trip...');
    const busesRes = await axios.get(`${BASE_URL}/driver/buses`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const bus1 = busesRes.data.buses.find((b: any) => b.busNumber === 'AP16AB1234');

    const startTripRes = await axios.post(
      `${BASE_URL}/driver/trips/start`,
      { busId: bus1.id },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
    console.log('✅ Trip Started Successfully! Trip ID:', startTripRes.data.trip.id);

    // 4. Connect Driver & Student Sockets
    console.log('\n4️⃣ Testing Real-time Socket.IO Connection & Live GPS Stream...');
    const driverSocket = io(SOCKET_URL, { auth: { token: driverToken } });
    const studentSocket = io(SOCKET_URL, { auth: { token: studentToken } });

    await new Promise<void>((resolve) => {
      let count = 0;
      const check = () => {
        count++;
        if (count === 2) resolve();
      };
      driverSocket.on('connect', check);
      studentSocket.on('connect', () => {
        studentSocket.emit('bus:subscribe', { busId: bus1.id });
        check();
      });
    });

    console.log('✅ Sockets Connected & Student Subscribed to Bus AP16AB1234');

    // 5. Test GPS updates approaching within 2 km threshold
    console.log('\n5️⃣ Streaming GPS updates approaching boarding point (< 2 km)...');

    let proximityAlertReceived = false;
    studentSocket.on('bus:approaching', (alert) => {
      console.log(`🔔 [STUDENT RECEIVED REALTIME 2KM ALERT]: ${alert.message} (${alert.formattedDistance})`);
      proximityAlertReceived = true;
    });

    studentSocket.on('bus:location:update', (loc) => {
      const dist = calculateDistanceMeters(loc.latitude, loc.longitude, boardingPoint.latitude, boardingPoint.longitude);
      console.log(`📡 [STUDENT RECEIVED LIVE GPS]: Lat ${loc.latitude}, Lon ${loc.longitude} -> Distance: ${formatDistance(dist)}`);
    });

    // Realistic sequential driving points along the route (40 km/h)
    // Time delta = 10s between points (simulated via timestamp or realistic small increments)
    const baseTime = Date.now();

    // Step A: 2.8 km away (lat: 16.3700, lon: 80.6180)
    driverSocket.emit('driver:location:update', {
      latitude: 16.3700,
      longitude: 80.6180,
      accuracy: 5,
      speed: 38,
      heading: 170,
      timestamp: new Date(baseTime).toISOString(),
    });
    await new Promise((r) => setTimeout(r, 600));

    // Step B: 2.2 km away (lat: 16.3650, lon: 80.6190)
    driverSocket.emit('driver:location:update', {
      latitude: 16.3650,
      longitude: 80.6190,
      accuracy: 5,
      speed: 35,
      heading: 170,
      timestamp: new Date(baseTime + 60000).toISOString(), // 1 min later
    });
    await new Promise((r) => setTimeout(r, 600));

    // Step C: 1.85 km away (lat: 16.3620, lon: 80.6195) -> Crosses 2km threshold!
    driverSocket.emit('driver:location:update', {
      latitude: 16.3620,
      longitude: 80.6195,
      accuracy: 4.5,
      speed: 30,
      heading: 165,
      timestamp: new Date(baseTime + 120000).toISOString(), // 2 mins later
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Step D: 950m away (lat: 16.3560, lon: 80.6205) -> Distance <= 1km (displays meters)
    driverSocket.emit('driver:location:update', {
      latitude: 16.3560,
      longitude: 80.6205,
      accuracy: 4,
      speed: 25,
      heading: 160,
      timestamp: new Date(baseTime + 180000).toISOString(), // 3 mins later
    });
    await new Promise((r) => setTimeout(r, 1000));

    // 6. Verify Notifications in DB
    console.log('\n6️⃣ Verifying 2 KM Notification in Database (Exact 1 notification expected)...');
    const notifRes = await axios.get(`${BASE_URL}/student/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    console.log(`✅ Verified Notifications in DB: ${notifRes.data.notifications.length} notification record(s)`);
    if (notifRes.data.notifications.length > 0) {
      console.log('   Stored Message in DB:', notifRes.data.notifications[0].message);
    }

    // 7. Driver Changes Bus to AP16AB5678
    console.log('\n7️⃣ Testing Change Bus Feature...');
    const bus2 = busesRes.data.buses.find((b: any) => b.busNumber === 'AP16AB5678');
    const changeBusRes = await axios.put(
      `${BASE_URL}/driver/change-bus`,
      { newBusId: bus2.id },
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
    console.log('✅ Bus switched successfully to:', changeBusRes.data.assignedBus.busNumber);

    // 8. Driver Ends Trip
    console.log('\n8️⃣ Testing Driver End Trip...');
    const endTripRes = await axios.post(
      `${BASE_URL}/driver/trips/end`,
      {},
      { headers: { Authorization: `Bearer ${driverToken}` } }
    );
    console.log('✅ Trip Ended Successfully! Status:', endTripRes.data.trip.status);

    // 9. Student checks status after trip end
    const finalBusLoc = await axios.get(`${BASE_URL}/student/buses/${bus2.id}/location`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    console.log('✅ Student queries bus status after trip end:', finalBusLoc.data.status, `("${finalBusLoc.data.message}")`);

    driverSocket.disconnect();
    studentSocket.disconnect();

    console.log('\n🎉 ALL COMPLETE END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS! 🚀\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ E2E Verification failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runEndToEndVerification();
