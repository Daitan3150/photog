/**
 * Geocoding Utility using OpenStreetMap Nominatim API
 * This allows converting a location string to latitude/longitude without an API key.
 */

/**
 * Validates if the string is a valid manual GPS format (lat, lng)
 */
export function parseManualGPS(input: string): { lat: number; lng: number } | null {
    if (!input) return null;

    // Pattern: 35.1234, 139.1234 or index:lat,lng
    const match = input.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (match) {
        return {
            lat: parseFloat(match[1]),
            lng: parseFloat(match[2])
        };
    }
    return null;
}

export async function getCoordinates(locationName: string): Promise<{ lat: number; lng: number } | null> {
    if (!locationName || locationName.trim() === '') return null;

    // Check if it's already a manual GPS coordinate
    const manual = parseManualGPS(locationName);
    if (manual) return manual;

    try {
        // nominatim works best with structured queries. 
        // We append 'Japan' to narrow it down.
        const query = `${locationName} Japan`;
        const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=jp&addressdetails=1`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'NextPortfolio/1.0 (daitan3150-portfolio-contact)'
            }
        });

        if (!response.ok) {
            console.error('Nominatim API error:', response.statusText);
            return null;
        }

        const data = await response.json() as any;

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        return null;
    }
}
