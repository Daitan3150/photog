import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'DAITAN | Photographer Portfolio';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
    try {
        const baseUrl = 'https://next-portfolio-lime-one.vercel.app';

        // Use the newly provided and copied og-base.jpg
        const imageRes = await fetch(new URL(`${baseUrl}/images/og-base.jpg`));
        if (!imageRes.ok) throw new Error('Failed to fetch image');
        const imageData = await imageRes.arrayBuffer();

        return new ImageResponse(
            (
                <div
                    style={{
                        fontSize: 128,
                        backgroundColor: '#000',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        fontFamily: 'serif', // Next.js OG will use a fallback serif font
                    }}
                >
                    <img
                        src={imageData as any}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.85, // Show more of the beautiful photo
                        }}
                    />

                    {/* Subtle vignette for high-end look */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(circle, transparent 20%, rgba(0,0,0,0.4) 100%)',
                        }}
                    />

                    {/* Content Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '60px 100px',
                            position: 'relative',
                        }}
                    >
                        {/* Thin lines for classic editorial feel */}
                        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '2px', height: '40px', background: 'rgba(255,255,255,0.3)' }} />
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '2px', height: '40px', background: 'rgba(255,255,255,0.3)' }} />

                        <div
                            style={{
                                fontSize: 28,
                                letterSpacing: '1.2em',
                                color: 'rgba(255,255,255,0.9)',
                                marginBottom: 30,
                                textTransform: 'uppercase',
                                fontWeight: 300,
                            }}
                        >
                            Portfolio
                        </div>
                        <div
                            style={{
                                fontSize: 130,
                                color: 'white',
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                fontWeight: 'bold',
                                lineHeight: 1,
                                textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            }}
                        >
                            Daitan
                        </div>
                        <div
                            style={{
                                fontSize: 18,
                                letterSpacing: '0.5em',
                                color: 'rgba(255,255,255,0.7)',
                                marginTop: 40,
                                textTransform: 'uppercase',
                                fontStyle: 'italic',
                            }}
                        >
                            The Art of Photography
                        </div>
                    </div>
                </div>
            ),
            { ...size }
        );
    } catch (e) {
        console.error('OG Generation Error:', e);
        // Fallback remains the same
        return new ImageResponse(
            (
                <div
                    style={{
                        fontSize: 100,
                        background: 'linear-gradient(to bottom right, #111, #333)',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: 'white',
                    }}
                >
                    <div style={{ fontSize: 32, letterSpacing: '0.6em', opacity: 0.8, marginBottom: 20 }}>PORTFOLIO</div>
                    <div style={{ letterSpacing: '0.1em', fontWeight: 'bold' }}>DAITAN</div>
                    <div style={{ fontSize: 18, letterSpacing: '0.3em', opacity: 0.5, marginTop: 40 }}>PHOTOGRAPHY</div>
                </div>
            ),
            { ...size }
        );
    }
}
