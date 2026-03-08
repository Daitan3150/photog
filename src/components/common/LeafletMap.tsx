'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface LeafletMapProps {
    lat: number;
    lng: number;
    height?: string;
    className?: string;
    zoom?: number;
}

export default function LeafletMap({ lat, lng, height = '300px', className = '', zoom = 18 }: LeafletMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);
    const [libLoaded, setLibLoaded] = useState(false);

    // 地図の初期化または更新
    const updateMap = () => {
        if (typeof window === 'undefined' || !(window as any).L || !mapRef.current) return;

        const L = (window as any).L;

        if (!mapInstance.current) {
            // 初回初期化
            mapInstance.current = L.map(mapRef.current).setView([lat, lng], zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance.current);

            // マーカーアイコンの設定（Leafletのデフォルトはパスの問題で消えやすいためCDNから明示的に指定）
            const DefaultIcon = L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            });

            markerInstance.current = L.marker([lat, lng], { icon: DefaultIcon }).addTo(mapInstance.current);
        } else {
            // 既存の地図を移動
            mapInstance.current.setView([lat, lng], zoom);
            if (markerInstance.current) {
                markerInstance.current.setLatLng([lat, lng]);
            }

            // 地図がコンテナサイズ変更などで崩れるのを防ぐ
            setTimeout(() => {
                mapInstance.current?.invalidateSize();
            }, 100);
        }
    };

    useEffect(() => {
        if (libLoaded) {
            updateMap();
        }
    }, [lat, lng, libLoaded]);

    return (
        <div className={`w-full ${className}`}>
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                crossOrigin=""
            />
            <Script
                src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                crossOrigin=""
                onLoad={() => setLibLoaded(true)}
            />
            <div
                ref={mapRef}
                style={{ height }}
                className="rounded-xl border border-gray-200 shadow-md bg-gray-50 z-0 overflow-hidden"
            />
        </div>
    );
}
