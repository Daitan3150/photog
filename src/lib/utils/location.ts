
/**
 * Geocoding Utility using OpenStreetMap Nominatim API
 * This allows converting a location string to latitude/longitude without an API key.
 */

export async function getCoordinates(locationName: string): Promise<{ lat: number; lng: number } | null> {
    if (!locationName || locationName.trim() === '') return null;

    try {
        // Appending 'Japan' and using countrycodes=jp for better accuracy
        const query = `${locationName} Japan`;
        const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=jp`;

        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'NextPortfolio/1.0 (daitan3150no1-blog)' // Nominatim requires a User-Agent
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
