import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const auth = getAdminAuth();
        await auth.verifyIdToken(idToken);

        const data = await req.json() as any;

        // --- ⚡ 神経 (Nervous System): Worker への非同期依頼 ---
        const workerUrl = process.env.CLOUDFLARE_WORKER_URL;
        const authToken = process.env.WORKER_AUTH_TOKEN;

        if (!workerUrl) {
            // Fallback: If no worker is configured, return error or handle synchronously
            return NextResponse.json({ error: 'Worker not configured for async processing' }, { status: 500 });
        }

        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Worker gateway error: ${error}`);
        }

        return NextResponse.json({
            success: true,
            message: 'Async processing queued',
            queued: true
        });

    } catch (error: any) {
        console.error('Error in resize-async API:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
