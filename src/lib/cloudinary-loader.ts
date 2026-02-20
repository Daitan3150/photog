'use client';

import { ImageLoaderProps } from 'next/image';

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
    if (!src.includes('res.cloudinary.com')) {
        return src;
    }

    const params = ['f_auto', 'q_auto', `w_${width}`];

    // Allow overriding quality if explicitly provided, otherwise default to auto
    if (quality) {
        params.push(`q_${quality}`);
    }

    const paramsString = params.join(',') + '/';

    // Insert params after /upload/
    // Example: https://res.cloudinary.com/demo/image/upload/sample.jpg
    // Becomes: https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/sample.jpg

    if (src.includes('/upload/')) {
        return src.replace('/upload/', `/upload/${paramsString}`);
    }

    // Fallback if URL structure doesn't match standard Cloudinary upload URL
    return src;
}
