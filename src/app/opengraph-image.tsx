import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'DAITAN Portfolio';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 128,
                    background: 'black',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 style={{ fontFamily: 'serif', margin: 0, letterSpacing: '-0.05em' }}>DAITAN</h1>
                    <p style={{ fontSize: 32, letterSpacing: '0.5em', marginTop: 20, opacity: 0.7 }}>PHOTOGRAPHER</p>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
