'use client';

import { ImageLoaderProps } from 'next/image';

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
    if (!src || typeof src !== 'string' || !src.includes('res.cloudinary.com')) {
        return src || '';
    }

    // 🎯 画像変換クレジット削減: 指定された幅を標準ブレイクポイントに丸める
    // 任意サイズごとの重複変換を抑制し、CDNキャッシュヒット率を大幅向上
    const BUCKETS = [320, 640, 960, 1200, 1600, 2000];
    const targetWidth = BUCKETS.find(b => b >= width) || BUCKETS[BUCKETS.length - 1];

    const params = ['f_auto', 'q_auto', `w_${targetWidth}`];

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
