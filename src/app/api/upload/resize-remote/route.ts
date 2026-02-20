import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v2 as cloudinary } from 'cloudinary';
import { resizeImage } from '@/lib/image-processing';
import exifr from 'exifr';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const tempFiles: string[] = [];

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const { getAdminAuth } = await import('@/lib/firebaseAdmin');
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const { url, publicId, fileName, source } = await req.json() as any;

        const tempId = Math.random().toString(36).substring(7);
        const originalFilePath = path.join(os.tmpdir(), `remote_orig_${tempId}_${fileName || 'image.jpg'}`);
        const resizedFilePath = path.join(os.tmpdir(), `remote_resized_${tempId}_${fileName || 'image.jpg'}`);
        tempFiles.push(originalFilePath, resizedFilePath);

        if (source === 'r2') {
            // 1a. Download from R2
            const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: publicId,
            });
            const response = await r2Client.send(command);
            const body = await response.Body?.transformToByteArray();
            if (!body) throw new Error('Failed to download from R2');
            await fs.writeFile(originalFilePath, Buffer.from(body));
        } else {
            // 1b. Download from Firebase Storage (Legacy fallback)
            const { getAdminStorage } = await import('@/lib/firebaseAdmin');
            const bucket = getAdminStorage().bucket();
            const fileRef = bucket.file(publicId);
            await fileRef.download({ destination: originalFilePath });
        }

        // 2. Resize file
        await resizeImage(originalFilePath, resizedFilePath);

        // 3. Upload resized to Cloudinary
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

        // 4. Extract EXIF data
        let exifData = null;
        try {
            exifData = await exifr.parse(originalFilePath, {
                pick: ['Make', 'Model', 'LensModel', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'DateTimeOriginal']
            });
        } catch (exifErr) {
            console.warn('EXIF extraction failed:', exifErr);
        }

        // 5. Delete the ORIGINAL from source
        try {
            if (source === 'r2') {
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: publicId,
                });
                await r2Client.send(deleteCommand);
            } else {
                const { getAdminStorage } = await import('@/lib/firebaseAdmin');
                const bucket = getAdminStorage().bucket();
                await bucket.file(publicId).delete();
            }
        } catch (delErr) {
            console.warn('Source file deletion failed:', delErr);
        }

        return NextResponse.json({
            url: result.secure_url,
            publicId: result.public_id,
            resized: true,
            exif: exifData,
            tags: result.tags || []
        });

    } catch (error: any) {
        console.error('Error in upload-resize-remote API:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    } finally {
        // Cleanup local temp files
        for (const filePath of tempFiles) {
            try {
                await fs.unlink(filePath);
            } catch (err) { }
        }
    }
}
