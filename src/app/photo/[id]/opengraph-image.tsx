import { ImageResponse } from 'next/og';
import { getPhotoPublic } from '@/lib/actions/photos';

export const runtime = 'nodejs';
export const alt = 'DAITAN Portfolio - Photography';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const photo = await getPhotoPublic(id);

    if (!photo) {
        return new ImageResponse(
            (
                <div
                    style={{
                        background: '#f9fafb',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <h1 style={{ fontSize: 60, color: '#111827' }}>Photo Not Found</h1>
                </div>
            ),
            { ...size }
        );
    }

    // [OGP LOGIC] Use Focal Point for Background
    let bgUrl = photo.url;
    if (bgUrl.includes('res.cloudinary.com')) {
        let transform = 'c_fill,w_1200,h_630,q_auto,f_auto';
        if (photo.focalPoint && photo.focalPoint.x !== undefined && photo.focalPoint.y !== undefined) {
            transform += `,g_xy_center,x_${photo.focalPoint.x},y_${photo.focalPoint.y},fl_relative`;
        } else {
            transform += ',g_auto';
        }
        bgUrl = bgUrl.replace('/upload/', `/upload/${transform}/`);
    }

    return new ImageResponse(
        (
            <div
                style={{
                    background: '#000',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Background Image */}
                <img
                    src={bgUrl}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                    alt={photo.title}
                />

                {/* Gradient Overlay */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)',
                    }}
                />

                {/* Content */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '60px',
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.8)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4em',
                            marginBottom: 12,
                        }}
                    >
                        {photo.characterName || photo.subjectName || 'Photography'}
                    </div>
                    <div
                        style={{
                            fontSize: 72,
                            fontWeight: 900,
                            color: 'white',
                            lineHeight: 1.1,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {photo.title || 'DAITAN Portfolio'}
                    </div>

                    <div
                        style={{
                            marginTop: 32,
                            padding: '8px 20px',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '100px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            fontSize: 20,
                            color: 'white',
                            display: 'flex',
                        }}
                    >
                        next-portfolio-lime-one.vercel.app
                    </div>
                </div>

                {/* Branding Accent */}
                <div
                    style={{
                        position: 'absolute',
                        top: 40,
                        right: 40,
                        width: 120,
                        height: 4,
                        background: 'white',
                        opacity: 0.5,
                    }}
                />
            </div>
        ),
        {
            ...size,
        }
    );
}
