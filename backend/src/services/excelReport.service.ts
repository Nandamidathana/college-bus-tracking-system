import ExcelJS from 'exceljs';
import { prisma } from '../config/prisma';

/**
 * Formats time to 12-hour AM/PM string in IST
 */
function formatTimeIST(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * 1. Generates Daily Bus Arrival & Reporting Excel Sheet
 */
export async function generateDailyArrivalsExcel(
  collegeId: string,
  dateStr: string
): Promise<Buffer> {
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  const arrivals = await prisma.busArrival.findMany({
    where: {
      collegeId,
      date: dateStr,
    },
    include: {
      bus: {
        include: { route: true },
      },
      driver: {
        include: { user: true },
      },
    },
    orderBy: { arrivalTime: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College Bus Tracker System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Arrivals ${dateStr}`, {
    views: [{ showGridLines: true }],
  });

  // Calculate stats
  const total = arrivals.length;
  const onTimeCount = arrivals.filter((a) => a.status === 'ON_TIME').length;
  const delayedCount = arrivals.filter((a) => a.status === 'DELAYED').length;
  const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;
  const totalDelayMinutes = arrivals.reduce((acc, a) => acc + a.delayMinutes, 0);
  const avgDelay = delayedCount > 0 ? Math.round(totalDelayMinutes / delayedCount) : 0;

  // Title Banner
  worksheet.mergeCells('A1:J1');
  const titleRow = worksheet.getCell('A1');
  titleRow.value = `🚌 ${college?.name || 'College'} — Daily Bus Arrival & Attendance Log`;
  titleRow.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  // Subtitle / Metadata Row
  worksheet.mergeCells('A2:J2');
  const metaRow = worksheet.getCell('A2');
  metaRow.value = `Date: ${dateStr}  |  Official Gate Reporting Cutoff: ${college?.reportingTime || '09:00'} AM  |  Geofence Radius: ${college?.geofenceRadius || 100}m  |  Generated At: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`;
  metaRow.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
  metaRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  metaRow.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // KPI Summary Row
  worksheet.addRow([]);
  worksheet.addRow([
    'Total Buses Arrived:',
    total,
    'On-Time Arrivals:',
    onTimeCount,
    'Delayed Buses:',
    delayedCount,
    'On-Time Performance:',
    `${onTimeRate}%`,
    'Avg Delay (Delayed):',
    `${avgDelay} mins`,
  ]);

  const kpiRow = worksheet.getRow(4);
  kpiRow.height = 24;
  kpiRow.font = { name: 'Segoe UI', size: 10, bold: true };
  for (let i = 1; i <= 10; i++) {
    const cell = kpiRow.getCell(i);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (i % 2 === 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF475569' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    }
  }

  worksheet.addRow([]); // Blank row

  // Table Headers
  const headers = [
    'Sl. No',
    'Date',
    'Bus Number',
    'Route Name',
    'Driver Name',
    'Driver Phone',
    'Reporting Time',
    'Arrival Time',
    'Status',
    'Delay Duration',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Table Data
  if (arrivals.length === 0) {
    const emptyRow = worksheet.addRow([
      '--',
      dateStr,
      'No arrivals recorded for this date.',
      '--',
      '--',
      '--',
      '--',
      '--',
      '--',
      '--',
    ]);
    emptyRow.height = 24;
    emptyRow.alignment = { horizontal: 'center', vertical: 'middle' };
  } else {
    arrivals.forEach((arr, idx) => {
      const isOnTime = arr.status === 'ON_TIME';
      const row = worksheet.addRow([
        idx + 1,
        arr.date,
        arr.bus?.busNumber || 'N/A',
        arr.bus?.route?.name || 'General Route',
        arr.driver?.driverName || 'N/A',
        arr.driver?.phone || arr.driver?.user?.phone || 'N/A',
        `${arr.reportingTime} AM`,
        formatTimeIST(arr.arrivalTime),
        isOnTime ? 'ON TIME' : 'DELAYED',
        isOnTime ? '0 mins' : `+${arr.delayMinutes} mins late`,
      ]);

      row.height = 22;
      row.font = { name: 'Segoe UI', size: 10 };

      // Styling & cell colors
      row.eachCell((cell, colNum) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 3 || colNum === 4 || colNum === 5 ? 'left' : 'center',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Zebra striping
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }

        // Highlight Status column
        if (colNum === 9) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true };
          if (isOnTime) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF166534' } }; // Dark Green
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF991B1B' } }; // Dark Red
          }
        }

        // Highlight Delay duration column
        if (colNum === 10) {
          if (!isOnTime) {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
          } else {
            cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF15803D' } };
          }
        }
      });
    });
  }

  // Set explicit column widths
  worksheet.columns = [
    { width: 8 },  // Sl No
    { width: 14 }, // Date
    { width: 16 }, // Bus Number
    { width: 28 }, // Route Name
    { width: 22 }, // Driver Name
    { width: 18 }, // Driver Phone
    { width: 16 }, // Reporting Time
    { width: 16 }, // Arrival Time
    { width: 16 }, // Status
    { width: 18 }, // Delay Duration
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * 2. Generates Daily Delayed Buses Excel Report
 */
export async function generateDelayedBusesExcel(
  collegeId: string,
  dateStr: string
): Promise<Buffer> {
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  const delayedArrivals = await prisma.busArrival.findMany({
    where: {
      collegeId,
      date: dateStr,
      status: 'DELAYED',
    },
    include: {
      bus: {
        include: { route: true },
      },
      driver: {
        include: { user: true },
      },
    },
    orderBy: { delayMinutes: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Delayed Buses ${dateStr}`, {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  worksheet.mergeCells('A1:I1');
  const titleRow = worksheet.getCell('A1');
  titleRow.value = `🚨 ${college?.name || 'College'} — Daily Delayed Buses Incident Report`;
  titleRow.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Crimson Red
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  // Subtitle
  worksheet.mergeCells('A2:I2');
  const metaRow = worksheet.getCell('A2');
  metaRow.value = `Date: ${dateStr}  |  Official Reporting Cutoff: ${college?.reportingTime || '09:00'} AM  |  Total Delayed: ${delayedArrivals.length} Buses`;
  metaRow.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFFEE2E2' } };
  metaRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
  metaRow.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  worksheet.addRow([]); // Blank

  // Headers
  const headers = [
    'Sl. No',
    'Bus Number',
    'Route Name',
    'Driver Name',
    'Driver Phone',
    'Expected Cutoff',
    'Actual Arrival Time',
    'Delay Duration',
    'Action / Remarks',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF991B1B' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  if (delayedArrivals.length === 0) {
    const emptyRow = worksheet.addRow([
      '--',
      'No delayed buses on this date!',
      'All buses reached on or before cutoff time.',
      '--',
      '--',
      '--',
      '--',
      '--',
      '--',
    ]);
    emptyRow.height = 24;
    emptyRow.alignment = { horizontal: 'center', vertical: 'middle' };
  } else {
    delayedArrivals.forEach((arr, idx) => {
      const row = worksheet.addRow([
        idx + 1,
        arr.bus?.busNumber || 'N/A',
        arr.bus?.route?.name || 'General Route',
        arr.driver?.driverName || 'N/A',
        arr.driver?.phone || arr.driver?.user?.phone || 'N/A',
        `${arr.reportingTime} AM`,
        formatTimeIST(arr.arrivalTime),
        `+${arr.delayMinutes} mins late`,
        arr.delayMinutes > 30 ? 'Severe Delay - Follow-up Required' : 'Moderate Delay',
      ]);

      row.height = 22;
      row.font = { name: 'Segoe UI', size: 10 };

      row.eachCell((cell, colNum) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 2 || colNum === 3 || colNum === 4 ? 'left' : 'center',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (colNum === 8) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        }
      });
    });
  }

  worksheet.columns = [
    { width: 8 },  // Sl No
    { width: 16 }, // Bus Number
    { width: 28 }, // Route Name
    { width: 22 }, // Driver Name
    { width: 18 }, // Driver Phone
    { width: 18 }, // Expected Cutoff
    { width: 20 }, // Actual Arrival Time
    { width: 18 }, // Delay Duration
    { width: 32 }, // Remarks
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * 3. Generates Monthly Performance Workbook with Driver and Route breakdowns
 */
export async function generateMonthlyPerformanceExcel(
  collegeId: string,
  year: number,
  month: number
): Promise<Buffer> {
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const prefix = `${year}-${monthStr}`;

  // Fetch all arrivals for this month
  const arrivals = await prisma.busArrival.findMany({
    where: {
      collegeId,
      date: { startsWith: prefix },
    },
    include: {
      bus: { include: { route: true } },
      driver: { include: { user: true } },
    },
    orderBy: { arrivalTime: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'College Bus Tracker System';

  // --- SHEET 1: Monthly Summary ---
  const summarySheet = workbook.addWorksheet('Monthly Overview', {
    views: [{ showGridLines: true }],
  });

  summarySheet.mergeCells('A1:F1');
  const sumTitle = summarySheet.getCell('A1');
  sumTitle.value = `📊 ${college?.name || 'College'} — Monthly Bus Arrival Performance (${prefix})`;
  sumTitle.font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  sumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 36;

  const totalTrips = arrivals.length;
  const onTimeTrips = arrivals.filter((a) => a.status === 'ON_TIME').length;
  const delayedTrips = arrivals.filter((a) => a.status === 'DELAYED').length;
  const monthlyOnTimePct = totalTrips > 0 ? Math.round((onTimeTrips / totalTrips) * 100) : 100;
  const totalDelayMinutes = arrivals.reduce((acc, a) => acc + a.delayMinutes, 0);

  summarySheet.addRow([]);
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.getRow(3).font = { name: 'Segoe UI', size: 11, bold: true };

  const kpis = [
    ['Month Period', prefix],
    ['Total Recorded Bus Arrivals', totalTrips],
    ['Total On-Time Arrivals', onTimeTrips],
    ['Total Delayed Arrivals', delayedTrips],
    ['Overall On-Time Performance Rate', `${monthlyOnTimePct}%`],
    ['Total Delay Time Incurred', `${totalDelayMinutes} minutes`],
    ['Average Delay per Delayed Trip', delayedTrips > 0 ? `${Math.round(totalDelayMinutes / delayedTrips)} mins` : '0 mins'],
  ];

  kpis.forEach(([label, val]) => {
    const row = summarySheet.addRow([label, val]);
    row.height = 22;
    row.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true };
    row.getCell(2).font = { name: 'Segoe UI', size: 10 };
    row.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    row.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });

  summarySheet.columns = [{ width: 36 }, { width: 30 }];

  // --- SHEET 2: Driver Performance ---
  const driverSheet = workbook.addWorksheet('Driver Performance', {
    views: [{ showGridLines: true }],
  });

  driverSheet.mergeCells('A1:G1');
  const drvTitle = driverSheet.getCell('A1');
  drvTitle.value = `👨‍✈️ Driver Performance & Punctuality Breakdown (${prefix})`;
  drvTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  drvTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal
  drvTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  driverSheet.getRow(1).height = 32;

  const drvHeaders = [
    'Sl. No',
    'Driver Name',
    'Phone Number',
    'Total Trips',
    'On-Time Trips',
    'Delayed Trips',
    'Punctuality Rate (%)',
  ];
  const drvHeadRow = driverSheet.addRow(drvHeaders);
  drvHeadRow.height = 26;
  drvHeadRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  drvHeadRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Group by driver
  const driverMap = new Map<string, { name: string; phone: string; total: number; onTime: number; delayed: number }>();
  arrivals.forEach((a) => {
    const drvId = a.driverId;
    if (!driverMap.has(drvId)) {
      driverMap.set(drvId, {
        name: a.driver?.driverName || 'Unknown',
        phone: a.driver?.phone || a.driver?.user?.phone || 'N/A',
        total: 0,
        onTime: 0,
        delayed: 0,
      });
    }
    const stat = driverMap.get(drvId)!;
    stat.total += 1;
    if (a.status === 'ON_TIME') stat.onTime += 1;
    else stat.delayed += 1;
  });

  let drvIdx = 1;
  driverMap.forEach((stat) => {
    const punctuality = stat.total > 0 ? Math.round((stat.onTime / stat.total) * 100) : 0;
    const row = driverSheet.addRow([
      drvIdx++,
      stat.name,
      stat.phone,
      stat.total,
      stat.onTime,
      stat.delayed,
      `${punctuality}%`,
    ]);
    row.height = 22;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
  });

  driverSheet.columns = [
    { width: 8 },
    { width: 24 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 22 },
  ];

  // --- SHEET 3: Detailed Arrival Logs ---
  const logSheet = workbook.addWorksheet('All Arrival Logs', {
    views: [{ showGridLines: true }],
  });

  const logHeadRow = logSheet.addRow([
    'Sl. No',
    'Date',
    'Bus Number',
    'Route Name',
    'Driver Name',
    'Reporting Time',
    'Arrival Time',
    'Status',
    'Delay Duration',
  ]);
  logHeadRow.height = 26;
  logHeadRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  logHeadRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  arrivals.forEach((arr, idx) => {
    const isOnTime = arr.status === 'ON_TIME';
    const row = logSheet.addRow([
      idx + 1,
      arr.date,
      arr.bus?.busNumber || 'N/A',
      arr.bus?.route?.name || 'General Route',
      arr.driver?.driverName || 'N/A',
      `${arr.reportingTime} AM`,
      formatTimeIST(arr.arrivalTime),
      arr.status,
      isOnTime ? '0 mins' : `+${arr.delayMinutes} mins`,
    ]);
    row.height = 20;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  });

  logSheet.columns = [
    { width: 8 },
    { width: 14 },
    { width: 16 },
    { width: 28 },
    { width: 22 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 16 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
