import { Bus, BoardingPoint } from '../types';

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
 * Checks whether a bus serves a student's boarding point.
 * The bus's assigned route stops (boardingPoints) are the strict source of truth.
 */
export function checkBusServesBoardingStop(
  bus?: Bus | { id?: string; routeId?: string; route?: { id?: string; name?: string; boardingPoints?: Array<{ id?: string; name: string }> } } | null,
  studentBp?: BoardingPoint | { id?: string; name: string; routeId?: string } | null,
  studentRouteId?: string | null
): boolean {
  if (!bus) return false;
  if (!studentBp) return true; // If student has no boarding point registered yet, show all buses

  const stops = bus.route?.boardingPoints || [];
  if (stops.length === 0) return false;

  // 1. Direct Stop ID match in bus route stops
  if (studentBp.id && stops.some((s) => s.id && s.id === studentBp.id)) {
    return true;
  }

  // 2. Name-based match excluding destination/college stops
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
          (bpToken.length >= 4 && sToken.includes(bpToken)) ||
          (sToken.length >= 4 && bpToken.includes(sToken))
      )
    );
    if (hasMatch) return true;
  }

  // Check if student stop matches bus route name tokens
  const matchesRouteName = bpTokens.some((bpToken) =>
    routeNameTokens.some(
      (rToken) =>
        rToken === bpToken ||
        (bpToken.length >= 4 && rToken.includes(bpToken)) ||
        (rToken.length >= 4 && bpToken.includes(rToken))
    )
  );

  return matchesRouteName;
}
