"use client";

import { useEffect, useState } from "react";
import { getMapEmbedUrl } from "@/lib/actions/map";

export default function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
    const [mapUrl, setMapUrl] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function load() {
            try {
                // Try to get via Server Action first
                let url = await getMapEmbedUrl(lat, lng);

                // Fallback to client-side NEXT_PUBLIC_ fallback if server action returned null
                if (!url) {
                    const fallbackKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
                    if (fallbackKey) {
                        url = `https://www.google.com/maps/embed/v1/place?key=${fallbackKey}&q=${lat},${lng}&zoom=15`;
                    }
                }

                if (isMounted) {
                    if (url) {
                        setMapUrl(url);
                    } else {
                        setErrorMsg("地図を表示するためのAPIキーが見つかりません。");
                    }
                }
            } catch (err) {
                console.error("Failed to load map URL via Server Action", err);
                if (isMounted) {
                    setErrorMsg("地図の読み込みに失敗しました。");
                }
            }
        }
        load();

        return () => {
            isMounted = false;
        };
    }, [lat, lng]);

    if (errorMsg) {
        return (
            <div className="w-full h-40 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-200">
                <p className="text-xs text-gray-500 font-bold">{errorMsg}</p>
            </div>
        );
    }

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
