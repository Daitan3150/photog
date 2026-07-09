import { NextRequest, NextResponse } from 'next/server';
import { getPhotoPublic } from '@/lib/actions/photos';
import { buildCroppedOgImageUrl, resolveOgImageSource } from '@/lib/ogp';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const params = await context.params;
        const id = params?.id;
        if (!id) {
            return new NextResponse('Photo ID missing', { status: 400 });
        }

        const url = new URL(request.url);
        const fp = url.searchParams.get('fp') || undefined;

        const photo = await getPhotoPublic(id);
        if (!photo) {
            return new NextResponse('Photo Not Found', { status: 404 });
        }

        const photoUrl = resolveOgImageSource(photo);
        if (!photoUrl) {
            return new NextResponse('Photo source URL missing', { status: 404 });
        }

        const bgUrl = buildCroppedOgImageUrl(photoUrl, photo.focalPoint, fp);
        if (!bgUrl) {
            return new NextResponse('Unable to build OGP image URL', { status: 500 });
        }

        return NextResponse.redirect(bgUrl, 302);
    } catch (error) {
        console.error('[photo][id]/opengraph-image route] error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
