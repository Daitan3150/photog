"use server";

export async function getMapEmbedUrl(lat: number, lng: number): Promise<string | null> {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "AIzaSyBdhiREiTTViaDBXSvfkjxCKi71Bi0232A";

        if (!apiKey) {
            console.error("Map API Key is not configured on the server.");
            return null;
        }

        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`;
    } catch (error) {
        console.error("Failed to generate map URL:", error);
        return null;
    }
}
