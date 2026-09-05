export interface GeocodeResult {
  displayName: string;
  name: string;
  latitude: number;
  longitude: number;
}

// Search location name using OpenStreetMap Nominatim
export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    // Prioritize Andhra Pradesh & India bounds to avoid cross-country results
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&countrycodes=in&viewbox=79.5,17.5,82.2,15.5&bounded=0&limit=7&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((item: any) => ({
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch (err) {
    console.warn('Geocoding search failed:', err);
    return [];
  }
}

// Reverse geocode latitude/longitude to address name
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.display_name || data.name || null;
  } catch (err) {
    console.warn('Reverse geocoding failed:', err);
    return null;
  }
}
