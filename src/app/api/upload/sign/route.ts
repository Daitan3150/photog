import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAdminAuth } from '@/lib/firebaseAdmin';

cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const { paramsToSign } = await req.json() as any;

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET || ''
        );

        return NextResponse.json({
            signature,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        });
    } catch (error: any) {
        console.error('Error signing upload:', error);
        return NextResponse.json({ error: 'Failed to sign upload' }, { status: 500 });
    }
}
