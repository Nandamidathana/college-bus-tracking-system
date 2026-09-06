const STOP_NOISE_WORDS = new Set([
  'bus',
  'stand',
  'stop',
  'stops',
  'road',
  'rd',
  'junction',
  'junc',
  'jn',
  'center',
  'centre',
  'circle',
  'stage',
  'depot',
  'point',
  'points',
  'near',
  'opp',
  'opposite',
  'beside',
  'behind',
  'gate',
  'campus',
  'college',
  'bhavan',
  'hotel',
  'chowk',
  'cross',
  'crossroad',
  'main',
  'old',
  'new',
  'village',
  'town',
  'city',
  'station',
  'stn',
  'rly',
  'srgec',
  'terminus',
  'the',
  'and',
]);

/**
 * Extracts distinctive place / village / landmark tokens from a name string,
 * removing generic transit noise words like 'bus', 'stand', 'junction', 'gate', etc.
 */
export function extractDistinctiveTokens(name: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_NOISE_WORDS.has(w));
}

/**
 * Checks whether a bus serves a student's boarding point strictly by route ID, stop ID,
 * exact stop name, or distinctive token matching (excluding college/campus noise words).
 */
export function checkBusServesBoardingStop(
  bus?: { id?: string; routeId?: string | null; route?: { id?: string; name?: string; boardingPoints?: Array<{ id?: string; name: string }> } | null } | null,
  studentBp?: { id?: string; name?: string; routeId?: string | null } | null,
  studentRouteId?: string | null
): boolean {
  if (!bus) return false;
  if (!studentBp) return true; // If student has no boarding point registered yet, show all buses

  const busRouteId = bus.routeId || bus.route?.id;
  const bpRouteId = studentBp.routeId || studentRouteId;

  // 1. Direct Route ID match (Source of truth)
  if (busRouteId && bpRouteId && busRouteId === bpRouteId) {
    return true;
  }

  const stops = bus.route?.boardingPoints || [];
  if (stops.length === 0) return false;

  // 2. Direct Stop ID match
  if (studentBp.id && stops.some((s) => s.id && s.id === studentBp.id)) {
    return true;
  }

  // 3. Name-based match excluding destination/college stops
  const bpName = (studentBp.name || '').trim().toLowerCase();
  if (!bpName) return false;

  // Filter out college/campus destination stops from bus route stops
  const nonCollegeStops = stops.filter((s) => {
    const sName = (s.name || '').toLowerCase();
    return (
      !sName.includes('college') &&
      !sName.includes('campus') &&
      !sName.includes('srgec') &&
      !sName.includes('gate')
    );
  });

  // Check exact stop name match against route's non-college stops
  if (nonCollegeStops.some((s) => (s.name || '').trim().toLowerCase() === bpName)) {
    return true;
  }

  const bpTokens = extractDistinctiveTokens(bpName);
  if (bpTokens.length === 0) return false;

  const routeNameTokens = extractDistinctiveTokens(bus.route?.name || '');

  // Check distinctive tokens between student stop and non-college route stops
  for (const s of nonCollegeStops) {
    const stopTokens = extractDistinctiveTokens(s.name || '');
    const hasMatch = bpTokens.some((bpToken) =>
      stopTokens.some(
        (sToken) =>
          sToken === bpToken ||
          (bpToken.length >= 5 && sToken.includes(bpToken)) ||
          (sToken.length >= 5 && bpToken.includes(sToken))
      )
    );
    if (hasMatch) return true;
  }

  // Check if student stop matches bus route name tokens
  const matchesRouteName = bpTokens.some((bpToken) =>
    routeNameTokens.some(
      (rToken) =>
        rToken === bpToken ||
        (bpToken.length >= 5 && rToken.includes(bpToken)) ||
        (rToken.length >= 5 && bpToken.includes(rToken))
    )
  );

  return matchesRouteName;
}
