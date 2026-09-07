import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';

async function main() {
  const college = await prisma.college.findFirst({
    where: { code: 'SRGEC' },
    include: { routes: { include: { boardingPoints: true } } },
  });

  if (!college) return;

  const vjaRoute = college.routes.find(r => r.name.toLowerCase().includes('vijayawada'))!;
  const vuyyuruStop = vjaRoute.boardingPoints.find(bp => bp.name.toLowerCase().includes('vuyyuru'))!;

  const passwordHash = await bcrypt.hash('123456', 10);

  // Create or update student Nanda
  const existingUser = await prisma.user.findFirst({
    where: { email: 'nanda@srgec.edu' },
  });

  if (existingUser) {
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  const user = await prisma.user.create({
    data: {
      name: 'Nanda',
      passwordHash,
      role: 'STUDENT',
      collegeId: college.id,
      student: {
        create: {
          rollNumber: '24481A05M9',
          village: 'Vuyyuru Center',
          boardingPointId: vuyyuruStop.id,
          routeId: vjaRoute.id,
          collegeId: college.id,
        },
      },
    },
    include: { student: { include: { boardingPoint: true, route: true } } },
  });

  console.log('✅ Created student Nanda (24481A05M9 / 123456) assigned to Vijayawada Route (Stop: Vuyyuru Center)!');
}

main().finally(async () => { await prisma.$disconnect(); });
