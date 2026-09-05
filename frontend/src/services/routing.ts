export interface RouteNavigationData {
  roadCoordinates: [number, number][]; // [lat, lng] array along actual roads
  distanceMeters: number;
  durationSeconds: number;
  formattedDistance: string;
  estimatedMinutes: number;
}

// Fetch real road navigation path and driving distance between Bus and Student Boarding Point using OSRM
export async function fetchRoadRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteNavigationData | null> {
  try {
    // OSRM expects coordinates in lng,lat format
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    // Convert GeoJSON [lng, lat] coordinates to Leaflet [lat, lng] format
    const roadCoordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const distanceMeters = Math.round(route.distance);
    const durationSeconds = Math.round(route.duration);
    const estimatedMinutes = Math.max(1, Math.round(durationSeconds / 60));

    let formattedDistance = `${(distanceMeters / 1000).toFixed(1)} km`;
    if (distanceMeters < 1000) {
      formattedDistance = `${distanceMeters} m`;
    }

    return {
      roadCoordinates,
      distanceMeters,
      durationSeconds,
      formattedDistance,
      estimatedMinutes,
    };
  } catch (error) {
    console.warn('OSRM road routing fetch error, fallback to direct line:', error);
    return null;
  }
}
