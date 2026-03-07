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
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

export async function getCoordinates(locationName: string): Promise<{ lat: number; lng: number; displayName?: string } | null> {
    if (!locationName || locationName.trim() === '') return null;

    // Check if it's already a manual GPS coordinate
    const manual = parseManualGPS(locationName);
    if (manual) {
        try {
            // Reverse geocode to get a clean address from coordinates
            const url = `https://nominatim.openstreetmap.org/reverse?lat=${manual.lat}&lon=${manual.lng}&format=json&addressdetails=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'NextPortfolio/1.0' } });
            if (res.ok) {
                const data = await res.json() as any;
                if (data && data.address) {
                    const addr = data.address;
                    let jpnAddr = '';
                    if (addr.postcode) jpnAddr += `〒${addr.postcode} `;
                    if (addr.province || addr.state) jpnAddr += (addr.province || addr.state);
                    if (addr.city || addr.town || addr.village) jpnAddr += (addr.city || addr.town || addr.village);
                    if (addr.suburb || addr.city_district) jpnAddr += (addr.suburb || addr.city_district);
                    if (addr.neighbourhood) jpnAddr += addr.neighbourhood;
                    if (addr.road) jpnAddr += addr.road;
                    if (addr.house_number) jpnAddr += addr.house_number;
                    return { ...manual, displayName: jpnAddr.trim() || data.display_name };
                }
            }
        } catch (e) { console.error(e); }
        return manual;
    }

    // Prepare search variations
    const normalized = zenkakuToHankaku(locationName.trim());
    const searchQueries = [
        normalized, // 1. Normalized version (half-width)
        normalized.replace(/\d+$/, '').trim(), // 2. Strip trailing house number (e.g. "6丁目2" -> "6丁目")
        normalized.split(/[\s,、　]/).join(' '), // 3. Ensure simple spaces
    ];

    for (const query of [...new Set(searchQueries)]) {
        if (!query) continue;
        try {
            // nominatim works best with structured queries. 
            // We append 'Japan' to narrow it down.
            const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=jp&addressdetails=1`;

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'NextPortfolio/1.0 (daitan3150-portfolio-contact)'
                }
            });

            if (!response.ok) {
                console.error('Nominatim API error:', response.statusText);
                continue; // Try next query
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
        } catch (error) {
            console.error('Error fetching coordinates:', error);
        }
    }

    return null;
}
