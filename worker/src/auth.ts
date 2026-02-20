import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_PROJECT_ID = 'daitan-portfolio';
const JWKS_URL = `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string } | null> {
    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
            algorithms: ['RS256'],
        });

        if (!payload.sub) return null;

        return {
            uid: payload.sub,
            email: payload.email as string | undefined,
        };
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}
