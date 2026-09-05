import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const AP_COLLEGES = [
  {
    name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)',
    code: 'SRGEC',
    latitude: 16.35068,
    longitude: 81.04273,
    address: 'Gudlavalleru, Krishna District, Andhra Pradesh - 521356',
  },
];

async function main() {
  console.log('🧹 Purging all old student, driver, trip, and history data...');

  // Complete cleanup of all student, driver, location and trip tables
  await prisma.notification.deleteMany();
  await prisma.locationHistory.deleteMany();
  await prisma.liveLocation.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.student.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.boardingPoint.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();
  await prisma.college.deleteMany();

  console.log('✨ Database completely cleaned!');
  console.log('🌱 Seeding fresh colleges and college administrator accounts...');

  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

  for (const colData of AP_COLLEGES) {
    const college = await prisma.college.create({
      data: {
        name: colData.name,
        code: colData.code,
        latitude: colData.latitude,
        longitude: colData.longitude,
        address: colData.address,
      },
    });

    // Create single clean Administrator account for each college
    const adminEmail = `admin@${colData.code.toLowerCase()}.edu`;
    await prisma.user.create({
      data: {
        name: `${colData.code} Admin`,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        collegeId: college.id,
      },
    });
  }

  console.log(`🎉 Reset complete! Fresh database ready with 12 Andhra Pradesh colleges and 0 student/driver records.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
