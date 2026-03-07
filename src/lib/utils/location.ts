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

export async function getCoordinates(locationName: string): Promise<{ lat: number; lng: number; displayName?: string } | null> {
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
            const addr = data[0].address;
            // Build a clean Japanese address format: 〒123-4567 〇〇県〇〇市...
            let jpnAddress = '';
            if (addr.postcode) jpnAddress += `〒${addr.postcode} `;
            if (addr.province || addr.state) jpnAddress += (addr.province || addr.state);
            if (addr.city || addr.town || addr.village) jpnAddress += (addr.city || addr.town || addr.village);
            if (addr.suburb || addr.city_district) jpnAddress += (addr.suburb || addr.city_district);
            if (addr.neighbourhood) jpnAddress += addr.neighbourhood;
            if (addr.road) jpnAddress += addr.road;
            if (addr.house_number) jpnAddress += addr.house_number;

            // If the building name isn't already in the string, prepend it
            const building = addr.building || addr.amenity || addr.tourism || addr.historic;
            if (building && !jpnAddress.includes(building)) {
                jpnAddress = `${building} (${jpnAddress.trim()})`;
            }

            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                displayName: jpnAddress.trim() || data[0].display_name
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        return null;
    }
}
