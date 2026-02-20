'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

interface CloudinaryScriptProps {
    onLoad: () => void;
}

export default function CloudinaryScript({ onLoad }: CloudinaryScriptProps) {
    return (
        <Script
            src="https://upload-widget.cloudinary.com/global/all.js"
            onLoad={onLoad}
            strategy="afterInteractive"
        />
    );
}
