import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v2 as cloudinary } from 'cloudinary';
import { resizeImage } from '@/lib/image-processing';
import exifr from 'exifr';
import { getAdminAuth } from '@/lib/firebaseAdmin';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const maxDuration = 60; // 1 minute

export async function POST(req: NextRequest) {
    const tempFiles: string[] = [];

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const tempId = Math.random().toString(36).substring(7);
        const originalFilePath = path.join(os.tmpdir(), `upload_orig_${tempId}_${file.name}`);
        const resizedFilePath = path.join(os.tmpdir(), `upload_resized_${tempId}_${file.name}`);

        const isLarge = file.size > 10 * 1024 * 1024; // 10MB

        if (isLarge) {
            tempFiles.push(originalFilePath, resizedFilePath);
            // 1. Write original file to tmp
            await fs.writeFile(originalFilePath, buffer);
            console.log(`Large file detected (${(file.size / 1024 / 1024).toFixed(2)}MB). Writing to ${originalFilePath}`);

            // 2. Resize file
            await resizeImage(originalFilePath, resizedFilePath);
            console.log(`Resized file written to ${resizedFilePath}`);

            // 3. Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload(resizedFilePath, {
                    folder: 'portfolio',
                    resource_type: 'auto',
                    categorization: 'google_tagging',
                    auto_tagging: 0.6,
                }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
            }) as any;

            // 4. Extract EXIF
            let exifData = null;
            try {
                exifData = await exifr.parse(originalFilePath, {
                    pick: ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal']
                });
            } catch (err) {
                console.warn('EXIF extraction failed (large):', err);
            }

            return NextResponse.json({
                url: result.secure_url,
                publicId: result.public_id,
                resized: true,
                exif: exifData,
                tags: result.tags || []
            });
        } else {
            // Small file: Upload directly from buffer
            // 1. Extract EXIF from buffer
            let exifData = null;
            try {
                exifData = await exifr.parse(buffer, {
                    pick: ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal']
                });
            } catch (err) {
                console.warn('EXIF extraction failed (small):', err);
            }
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: 'portfolio',
                    resource_type: 'auto',
                    categorization: 'google_tagging',
                    auto_tagging: 0.6,
                }, (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                });
                uploadStream.end(buffer);
            }) as any;

            return NextResponse.json({
                url: result.secure_url,
                publicId: result.public_id,
                resized: false,
                exif: exifData,
                tags: result.tags || []
            });
        }

    } catch (error: any) {
        console.error('Error in upload-resize API:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    } finally {
        // 5. Cleanup temp files
        for (const filePath of tempFiles) {
            try {
                await fs.unlink(filePath);
                console.log(`Temporary file deleted: ${filePath}`);
            } catch (err) {
                // Ignore if already deleted or doesn't exist
            }
        }
    }
}
