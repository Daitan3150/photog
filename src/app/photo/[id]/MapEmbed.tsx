"use client";

import { useEffect, useState } from "react";

export default function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
    const [mapUrl, setMapUrl] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/mapurl", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: `${lat},${lng}` }),
                });

                if (!res.ok) return;

                const data = (await res.json()) as { mapUrl?: string };
                setMapUrl(data.mapUrl || null);
            } catch (err) {
                console.error("Failed to load map URL", err);
            }
        }
        load();
    }, [lat, lng]);

    if (!mapUrl) {
        return (
            <div className="w-full h-40 rounded-xl bg-black/5 border border-black/5 animate-pulse" />
        );
    }

    return (
        <div className="w-full h-40 rounded-xl overflow-hidden border border-black/5 bg-black/5 relative group">
            <iframe
                width="100%"
                height="100%"
                style={{ border: 0, filter: "grayscale(0.5) contrast(1.1)" }}
                loading="lazy"
                allowFullScreen
                src={mapUrl}
                className="group-hover:grayscale-0 transition-all duration-500"
            />
            <a
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-bold text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
                Google Mapsで開く
            </a>
        </div>
    );
}
