// src/app/api/mapurl/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { address } = await req.json();

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        // Use either private or public key
        const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "Map API Key is not configured" }, { status: 500 });
        }

        const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}&zoom=15`;

        return NextResponse.json({ mapUrl });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
