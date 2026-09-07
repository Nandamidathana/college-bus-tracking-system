/**
 * High-Precision Regional Geocoding Database for Andhra Pradesh / Krishna District / Vijayawada
 * Contains verified real-world GPS coordinates for all college bus route towns, villages, bus stands, and landmarks.
 */
export interface GeocodeLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export const AP_REGIONAL_DATABASE: GeocodeLocation[] = [
  // SRGEC College & Gudlavalleru Hub
  {
    name: 'Seshadri Rao Gudlavalleru Engineering College (SRGEC)',
    address: 'SRGEC Campus, Gudlavalleru, Krishna District, Andhra Pradesh - 521356',
    latitude: 16.35068,
    longitude: 81.04273,
    aliases: ['srgec', 'college campus', 'srgec gate', 'college gate', 'gudlavalleru engineering college', 'srgec college gate'],
  },
  {
    name: 'Himaja Boys Hostel',
    address: 'Himaja Boys Hostel, Gudlavalleru College Road, Krishna District - 521356',
    latitude: 16.3496,
    longitude: 81.0498,
    aliases: ['himaja', 'himaja hostel', 'himaja boys hostel', 'himaja hostel gudlavalleru'],
  },
  {
    name: 'Gudlavalleru Bus Stand',
    address: 'Gudlavalleru Bus Stand, Main Road, Gudlavalleru, Andhra Pradesh - 521356',
    latitude: 16.3476,
    longitude: 81.0534,
    aliases: ['gudlavalleru', 'gudlavalleru bus stand', 'gudlavalleru center'],
  },

  // Gudivada Hub
  {
    name: 'Gudivada RTC Bus Stand',
    address: 'RTC Complex, Bus Stand Road, Gudivada, Krishna District, Andhra Pradesh - 521301',
    latitude: 16.4321,
    longitude: 80.9976,
    aliases: ['gudivada', 'gudivada bus stand', 'gudivada rtc', 'gudivada bus complex', 'gudivada rtc bus stand'],
  },
  {
    name: 'Gudivada Railway Station',
    address: 'Railway Station Road, Gudivada, Andhra Pradesh - 521301',
    latitude: 16.4411,
    longitude: 80.9926,
    aliases: ['gudivada railway station', 'gudivada station', 'gudivada rly stn'],
  },
  {
    name: 'Nehru Chowk Gudivada',
    address: 'Nehru Chowk Center, Gudivada, Krishna District - 521301',
    latitude: 16.4365,
    longitude: 80.9942,
    aliases: ['nehru chowk', 'nehru chowk gudivada', 'gudivada chowk'],
  },

  // Machilipatnam Route
  {
    name: 'Machilipatnam RTC Bus Stand',
    address: 'RTC Bus Station, National Highway 216, Machilipatnam, Andhra Pradesh - 521001',
    latitude: 16.1875,
    longitude: 81.1389,
    aliases: ['machilipatnam', 'machilipatnam bus stand', 'machilipatnam rtc', 'bandar bus stand', 'bandar'],
  },
  {
    name: 'Chilakalapudi Bus Stop',
    address: 'Chilakalapudi, Machilipatnam, Krishna District, Andhra Pradesh - 521002',
    latitude: 16.1963,
    longitude: 81.1491,
    aliases: ['chilakalapudi', 'chilakalapudi bus stop', 'chilakalapudi center', 'chilakalapudi panduranga swamy temple'],
  },
  {
    name: 'Pedana Bus Stand',
    address: 'Main Road, Pedana, Krishna District, Andhra Pradesh - 521366',
    latitude: 16.2628,
    longitude: 81.1444,
    aliases: ['pedana', 'pedana bus stand', 'pedana center', 'pedana town'],
  },
  {
    name: 'Kavutaram (Kavtharam) Bus Stop',
    address: 'Kavutaram Center, Gudlavalleru Mandal, Krishna District - 521331',
    latitude: 16.3347,
    longitude: 81.0872,
    aliases: ['kavutaram', 'kavtharam', 'kavutaram bus stop', 'kavtharam bus stand', 'kavutaram center', 'kavutharam'],
  },
  {
    name: 'Bantumilli Bus Stand',
    address: 'Bantumilli Main Road, Krishna District, Andhra Pradesh - 521324',
    latitude: 16.3562,
    longitude: 81.2721,
    aliases: ['bantumilli', 'bantumilli bus stand', 'bantumilli center'],
  },
  {
    name: 'Mudinepalli Bus Stop',
    address: 'Mudinepalli Center, Krishna District, Andhra Pradesh - 521325',
    latitude: 16.4258,
    longitude: 81.1215,
    aliases: ['mudinepalli', 'mudinepalli bus stop', 'mudinepalli center'],
  },

  // Vijayawada Route
  {
    name: 'Vijayawada Pandit Nehru Bus Station (PNBS)',
    address: 'PNBS, Krishna River Road, Vijayawada, Andhra Pradesh - 520013',
    latitude: 16.5165,
    longitude: 80.6186,
    aliases: ['vijayawada', 'vijayawada bus stand', 'pnbs', 'vijayawada pnbs', 'pandit nehru bus station'],
  },
  {
    name: 'Benz Circle Vijayawada',
    address: 'Benz Circle, MG Road / NH 16 Junction, Vijayawada, Andhra Pradesh - 520010',
    latitude: 16.4975,
    longitude: 80.6515,
    aliases: ['benz circle', 'benz circle vijayawada', 'benz circle center', 'mg road vijayawada'],
  },
  {
    name: 'Ramavarappadu Ring Vijayawada',
    address: 'Ramavarappadu Ring, Eluru Road, Vijayawada, Andhra Pradesh - 521108',
    latitude: 16.5188,
    longitude: 80.6725,
    aliases: ['ramavarappadu', 'ramavarappadu ring', 'ramavarappadu junction'],
  },
  {
    name: 'Gannavaram Bus Stop',
    address: 'NH 16, Gannavaram, Krishna District, Andhra Pradesh - 521101',
    latitude: 16.5416,
    longitude: 80.8032,
    aliases: ['gannavaram', 'gannavaram bus stop', 'gannavaram airport', 'gannavaram center'],
  },
  {
    name: 'Hanuman Junction Bus Stand',
    address: 'Hanuman Junction, NH 16, Krishna District, Andhra Pradesh - 521105',
    latitude: 16.6385,
    longitude: 80.9575,
    aliases: ['hanuman junction', 'hanuman junction bus stand', 'hanuman jn'],
  },
  {
    name: 'Pamarru Center',
    address: 'Pamarru Bus Complex, NH 65 / SH 45 Junction, Krishna District - 521157',
    latitude: 16.3315,
    longitude: 80.9634,
    aliases: ['pamarru', 'pamarru bus stand', 'pamarru center', 'pamarru junction'],
  },
  {
    name: 'Vuyyuru Bus Stand',
    address: 'Vuyyuru Main Road, Krishna District, Andhra Pradesh - 521165',
    latitude: 16.3688,
    longitude: 80.8431,
    aliases: ['vuyyuru', 'vuyyuru bus stand', 'vuyyuru center', 'vuyyuru sugarmill'],
  },
  {
    name: 'Kankipadu Bus Stop',
    address: 'Kankipadu Center, NH 65, Krishna District, Andhra Pradesh - 521151',
    latitude: 16.4258,
    longitude: 80.7654,
    aliases: ['kankipadu', 'kankipadu bus stop', 'kankipadu center'],
  },
  {
    name: 'Penamaluru Center',
    address: 'Penamaluru, Vijayawada Rural, Andhra Pradesh - 520007',
    latitude: 16.4678,
    longitude: 80.7012,
    aliases: ['penamaluru', 'penamaluru center', 'penamaluru bus stop'],
  },

  // Anguluru Hub
  {
    name: 'Anguluru Bus Stop',
    address: 'Anguluru Center, Gudlavalleru Mandal, Krishna District, Andhra Pradesh - 521330',
    latitude: 16.3885,
    longitude: 81.0255,
    aliases: ['anguluru', 'anguluru bus stop', 'anguluru center', 'angulur'],
  },
  {
    name: 'Gudivada Ring Road / Bomma Center',
    address: 'Ring Road Junction, Gudivada, Krishna District - 521301',
    latitude: 16.4278,
    longitude: 80.9992,
    aliases: ['gudivada ring road', 'ring road gudivada', 'bomma center', 'gudivada bypass'],
  },

  // Additional AP Coastal Towns
  {
    name: 'Avanigadda Bus Stand',
    address: 'Avanigadda Main Road, Krishna District, Andhra Pradesh - 521121',
    latitude: 16.0214,
    longitude: 80.9185,
    aliases: ['avanigadda', 'avanigadda bus stand', 'avanigadda center'],
  },
  {
    name: 'Challapalli Center',
    address: 'Challapalli Raja Palace Road, Krishna District, Andhra Pradesh - 521126',
    latitude: 16.1189,
    longitude: 80.9324,
    aliases: ['challapalli', 'challapalli bus stand', 'challapalli center'],
  },
  {
    name: 'Kaikaluru RTC Bus Stand',
    address: 'Kaikaluru Main Road, Krishna / Eluru District, Andhra Pradesh - 521333',
    latitude: 16.5542,
    longitude: 81.2056,
    aliases: ['kaikaluru', 'kaikalur', 'kaikaluru bus stand'],
  },
  {
    name: 'Eluru Old Bus Stand',
    address: 'Old Bus Stand, Eluru, Andhra Pradesh - 534001',
    latitude: 16.7107,
    longitude: 81.0952,
    aliases: ['eluru', 'eluru bus stand', 'eluru rtc'],
  },
  {
    name: 'Tenali RTC Bus Stand',
    address: 'Guntur Road, Tenali, Guntur District, Andhra Pradesh - 522201',
    latitude: 16.2437,
    longitude: 80.6400,
    aliases: ['tenali', 'tenali bus stand', 'tenali center'],
  },
  {
    name: 'Guntur NTR Bus Station',
    address: 'Collectorate Road, Guntur, Andhra Pradesh - 522004',
    latitude: 16.3067,
    longitude: 80.4365,
    aliases: ['guntur', 'guntur bus stand', 'guntur ntr bus station'],
  },
  {
    name: 'Mangalagiri Bus Stand',
    address: 'Mangalagiri Main Road, Guntur District, Andhra Pradesh - 522503',
    latitude: 16.4328,
    longitude: 80.5694,
    aliases: ['mangalagiri', 'mangalagiri bus stand', 'mangalagiri center'],
  },
];

const GENERIC_KEYWORDS = new Set([
  'bus', 'stand', 'stop', 'station', 'rtc', 'complex', 'center', 'centre',
  'junction', 'jn', 'road', 'rd', 'point', 'area', 'town', 'ring', 'city', 'main',
  'bypass', 'gate', 'campus'
]);

function scoreMatch(query: string, loc: GeocodeLocation): number {
  const cleanQ = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleanQ) return 0;

  const locName = loc.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const aliases = loc.aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim());

  // 1. Exact full name or alias match
  if (locName === cleanQ || aliases.includes(cleanQ)) {
    return 1000;
  }

  // 1b. Sorted token exact match (e.g. "vijayawada benz circle" == "benz circle vijayawada")
  const qTokens = cleanQ.split(' ').filter((w) => w.length >= 2);
  const sigQTokens = qTokens.filter((w) => !GENERIC_KEYWORDS.has(w));
  const qSorted = sigQTokens.slice().sort().join(' ');

  for (const alias of aliases) {
    const aTokens = alias.split(' ').filter((w) => w.length >= 2).filter((w) => !GENERIC_KEYWORDS.has(w));
    if (qSorted && qSorted === aTokens.sort().join(' ')) {
      return 980;
    }
  }

  // 2. Alias matching
  for (const alias of aliases) {
    if (alias === cleanQ) return 950;
    if (cleanQ.startsWith(alias) || alias.startsWith(cleanQ)) return 850;
    if (cleanQ.includes(alias) || alias.includes(cleanQ)) return 750;
  }

  // 3. Name containment
  if (cleanQ.startsWith(locName) || locName.startsWith(cleanQ)) return 800;
  if (locName.includes(cleanQ) || cleanQ.includes(locName)) return 700;

  // 4. Token-based matching with generic word penalty
  const allLocTokens = new Set(
    [locName, ...aliases]
      .join(' ')
      .split(' ')
      .filter((w) => w.length >= 2)
  );

  const sigLocTokens = new Set(Array.from(allLocTokens).filter((w) => !GENERIC_KEYWORDS.has(w)));

  if (sigQTokens.length > 0) {
    let sigMatches = 0;
    for (const sqt of sigQTokens) {
      if (sigLocTokens.has(sqt) || Array.from(sigLocTokens).some((slt) => slt.includes(sqt) || sqt.includes(slt))) {
        sigMatches++;
      }
    }
    if (sigMatches === sigQTokens.length) {
      return 500 + sigMatches * 50;
    } else if (sigMatches > 0) {
      return 200 + sigMatches * 30;
    }
    return 0;
  }

  let genMatches = 0;
  for (const qt of qTokens) {
    if (allLocTokens.has(qt)) genMatches++;
  }
  return genMatches > 0 ? 50 + genMatches * 10 : 0;
}

/**
 * Searches the high-precision regional database for matching places
 */
export function lookupRegionalDatabase(query: string): GeocodeLocation[] {
  if (!query || query.trim().length < 2) return [];

  const scored = AP_REGIONAL_DATABASE
    .map((loc) => ({ loc, score: scoreMatch(query, loc) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((item) => item.loc);
}

/**
 * Geocodes any location name automatically:
 * Tier 1: Instant high-precision regional lookup
 * Tier 2: OpenStreetMap Nominatim live search with India / AP bounding
 */
export async function geocodeLocation(query: string): Promise<GeocodeLocation | null> {
  if (!query || query.trim().length < 2) return null;

  // Tier 1: Check regional database
  const localMatches = lookupRegionalDatabase(query);
  if (localMatches.length > 0) {
    return localMatches[0];
  }

  // Tier 2: Query OpenStreetMap Nominatim with India bounding box
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim() + ', Andhra Pradesh, India'
    )}&countrycodes=in&viewbox=79.5,17.5,82.2,15.5&bounded=0&limit=3&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CollegeBusTracker/2.0 (contact@srgec.edu)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        return {
          name: item.name || query.trim(),
          address: item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          aliases: [query.toLowerCase().trim()],
        };
      }
    }
  } catch (err) {
    console.warn('Live geocoding lookup failed:', err);
  }

  return null;
}
