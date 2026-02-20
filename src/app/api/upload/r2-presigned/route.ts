import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { fileName, fileType } = await request.json() as any;

        if (!fileName) {
            return NextResponse.json({ error: 'File name is required' }, { status: 400 });
        }

        // Generate a unique path for the user
        const key = `temp_uploads/${userId}/${Date.now()}_${fileName}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            ContentType: fileType || 'image/jpeg',
        });

        // URL expires in 15 minutes
        const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });

        return NextResponse.json({
            signedUrl,
            key,
            bucket: R2_BUCKET_NAME
        });

    } catch (error: any) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
