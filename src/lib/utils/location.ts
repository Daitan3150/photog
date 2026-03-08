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

/**
 * Converts zenkaku (full-width) numbers/letters to hankaku (half-width).
 * Crucial for Japanese address searching on OSM/Nominatim.
 */
function zenkakuToHankaku(str: string): string {
    return str
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        })
        .replace(/　/g, ' ')      // Zenkaku space
        .replace(/[－ー]/g, '-');  // Zenkaku hyphens
}

export interface LocationSearchResult {
    lat: number;
    lng: number;
    displayName: string;
    type?: string;
}

/**
 * Searches for multiple location candidates.
 * Returns up to 10 results for the user to pick from.
 */
export async function searchCoordinates(locationName: string): Promise<LocationSearchResult[]> {
    if (!locationName || locationName.trim() === '') return [];

    const normalized = zenkakuToHankaku(locationName.trim());
    try {
        // Nominatim search with higher limit
        const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalized)}&format=json&limit=10&countrycodes=jp&addressdetails=1`;

        const response = await fetch(searchUrl, {
            headers: { 'User-Agent': 'NextPortfolio/1.0 (daitan3150-portfolio-contact)' }
        });

        if (!response.ok) return [];

        const data = await response.json() as any[];
        if (!data || data.length === 0) return [];

        return data.map(item => {
            const addr = item.address;
            let jpnAddress = '';
            // 〒123-4567 〇〇県〇〇市... の形式を構築
            if (addr.postcode) jpnAddress += `〒${addr.postcode} `;
            if (addr.province || addr.state) jpnAddress += (addr.province || addr.state);
            if (addr.city || addr.town || addr.village) jpnAddress += (addr.city || addr.town || addr.village);
            if (addr.suburb || addr.city_district) jpnAddress += (addr.suburb || addr.city_district);
            if (addr.neighbourhood) jpnAddress += addr.neighbourhood;
            if (addr.road) jpnAddress += addr.road;
            if (addr.house_number) jpnAddress += addr.house_number;

            // 建物名や施設名があれば強調
            const building = addr.building || addr.amenity || addr.tourism || addr.historic || addr.shop || addr.office;
            if (building && !jpnAddress.includes(building)) {
                jpnAddress = `${building} (${jpnAddress.trim()})`;
            }

            return {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                displayName: jpnAddress.trim() || item.display_name,
                type: item.type
            };
        });
    } catch (error) {
        console.error('Error searching coordinates:', error);
        return [];
    }
}

export async function getCoordinates(locationName: string): Promise<{ lat: number; lng: number; displayName?: string } | null> {
    const results = await searchCoordinates(locationName);
    return results.length > 0 ? results[0] : null;
}

