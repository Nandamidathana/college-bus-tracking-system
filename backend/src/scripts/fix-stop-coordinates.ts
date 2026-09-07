import { prisma } from '../config/prisma';
import { AP_REGIONAL_DATABASE, lookupRegionalDatabase, geocodeLocation } from '../services/geocoding.service';

async function main() {
  console.log('Starting high-precision coordinate migration for database...');

  // 1. Fix Colleges
  const colleges = await prisma.college.findMany();
  console.log(`Found ${colleges.length} college(s) in database.`);

  for (const col of colleges) {
    const isSRGEC = col.name.toLowerCase().includes('gudlavalleru') || 
                    col.name.toLowerCase().includes('srgec') || 
                    col.code === 'SRGEC';
    
    if (isSRGEC) {
      if (Math.abs(col.latitude - 16.35068) > 0.001 || Math.abs(col.longitude - 81.04273) > 0.001) {
        await prisma.college.update({
          where: { id: col.id },
          data: {
            latitude: 16.35068,
            longitude: 81.04273,
            address: 'SRGEC Campus, Gudlavalleru, Krishna District, Andhra Pradesh - 521356',
          },
        });
        console.log(`  Updated College "${col.name}" coordinates -> [16.35068, 81.04273]`);
      }
    } else {
      const match = lookupRegionalDatabase(col.name)[0];
      if (match) {
        await prisma.college.update({
          where: { id: col.id },
          data: {
            latitude: match.latitude,
            longitude: match.longitude,
            address: match.address,
          },
        });
        console.log(`  Updated College "${col.name}" coordinates -> [${match.latitude}, ${match.longitude}]`);
      }
    }
  }

  // 2. Fix Boarding Points
  const boardingPoints = await prisma.boardingPoint.findMany({
    include: { route: true },
  });
  console.log(`Found ${boardingPoints.length} boarding point(s) in database.`);

  let bpFixedCount = 0;
  for (const bp of boardingPoints) {
    const bpName = bp.name.trim();
    const isDummy = (Math.abs(bp.latitude - 16.35) < 0.01 && Math.abs(bp.longitude - 80.62) < 0.01) ||
                    (Math.abs(bp.latitude - 16.355) < 0.01 && Math.abs(bp.longitude - 80.625) < 0.01) ||
                    (bp.latitude === 0 && bp.longitude === 0);

    const matches = lookupRegionalDatabase(bpName);
    let targetLocation = matches.length > 0 ? matches[0] : null;

    if (!targetLocation && isDummy) {
      targetLocation = await geocodeLocation(bpName);
    }

    if (targetLocation) {
      const isDiff = Math.abs(bp.latitude - targetLocation.latitude) > 0.0001 || 
                     Math.abs(bp.longitude - targetLocation.longitude) > 0.0001;

      if (isDiff || isDummy) {
        await prisma.boardingPoint.update({
          where: { id: bp.id },
          data: {
            latitude: targetLocation.latitude,
            longitude: targetLocation.longitude,
          },
        });
        console.log(`  Fixed Stop "${bp.name}" (Route: ${bp.route?.name || 'N/A'}): [${bp.latitude}, ${bp.longitude}] -> [${targetLocation.latitude}, ${targetLocation.longitude}]`);
        bpFixedCount++;
      }
    } else if (isDummy) {
      await prisma.boardingPoint.update({
        where: { id: bp.id },
        data: {
          latitude: 16.35068,
          longitude: 81.04273,
        },
      });
      console.log(`  Reset Dummy Stop "${bp.name}" -> SRGEC default coords [16.35068, 81.04273]`);
      bpFixedCount++;
    }
  }

  // 3. Fix Students
  const students = await prisma.student.findMany({
    include: { boardingPoint: true, user: true },
  });
  console.log(`Found ${students.length} student(s) in database.`);

  for (const st of students) {
    if (st.village) {
      const matches = lookupRegionalDatabase(st.village);
      if (matches.length > 0 && st.boardingPoint) {
        const match = matches[0];
        if (Math.abs(st.boardingPoint.latitude - match.latitude) > 0.001 || Math.abs(st.boardingPoint.longitude - match.longitude) > 0.001) {
          if (st.boardingPoint.name.toLowerCase().includes(st.village.toLowerCase()) || 
              st.boardingPoint.name.toLowerCase().includes('live') || 
              st.boardingPoint.name.toLowerCase().includes('boarding')) {
            await prisma.boardingPoint.update({
              where: { id: st.boardingPoint.id },
              data: {
                latitude: match.latitude,
                longitude: match.longitude,
              },
            });
            console.log(`  Synced Student "${st.user?.name || st.rollNumber}" (${st.village}) stop coords -> [${match.latitude}, ${match.longitude}]`);
          }
        }
      }
    }
  }

  console.log(`\nMigration Complete! Fixed ${bpFixedCount} boarding point(s).`);
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
