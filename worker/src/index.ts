import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, PhotoData } from './types';
import { verifyFirebaseToken } from './auth';
import { batchSavePhotos } from './firestore';
import { syncPhotosToAlgolia } from './algolia';
import { PhotoCounter } from './counter';

export { PhotoCounter };

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('/*', cors({
	origin: (origin, c) => {
		const allowed = c.env.ALLOWED_ORIGIN || 'https://next-portfolio-lime-one.vercel.app';
		return origin === allowed ? allowed : allowed; // Simple check for now
	},
	allowHeaders: ['Content-Type', 'Authorization'],
	allowMethods: ['POST', 'OPTIONS'],
	exposeHeaders: ['Content-Length'],
	maxAge: 600,
	credentials: true,
}));

app.get('/', (c) => {
	return c.text('Next Portfolio Worker API is running.');
});

// 🧠 Short-term Memory (KV): Recent Works Cache
app.get('/api/recent-works', async (c) => {
	const cacheKey = 'recent-works';
	const cached = await c.env.PORTFOLIO_CACHE.get(cacheKey);

	if (cached) {
		return c.newResponse(cached, 200, {
			'Content-Type': 'application/json',
			'X-Cache-Status': 'HIT'
		});
	}

	// Cache Miss: Client should fetch from Firestore and call /api/recent-works/update
	return c.json({
		success: false,
		error: 'Cache miss. Client should fetch from Firestore and update cache.'
	}, 404, {
		'X-Cache-Status': 'MISS'
	});
});

app.post('/api/recent-works/update', async (c) => {
	try {
		const authHeader = c.req.header('Authorization');
		if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

		const body = await c.req.json();
		// Update Cache (TTL: 1 hour)
		await c.env.PORTFOLIO_CACHE.put('recent-works', JSON.stringify(body), { expirationTtl: 3600 });
		return c.json({ success: true });
	} catch (e: any) {
		return c.json({ error: e.message }, 500);
	}
});

// 🧠 Long-term Memory (Durable Objects): Like Counter
app.all('/api/photos/:id/like', async (c) => {
	const id = c.req.param('id');
	const doId = c.env.PHOTO_COUNTER.idFromName(id);
	const stub = c.env.PHOTO_COUNTER.get(doId);
	return stub.fetch(c.req.raw);
});

app.all('/api/photos/:id/likes', async (c) => {
	const id = c.req.param('id');
	const doId = c.env.PHOTO_COUNTER.idFromName(id);
	const stub = c.env.PHOTO_COUNTER.get(doId);
	return stub.fetch(c.req.raw);
});

app.post('/api/save-photos', async (c) => {
	try {
		const authHeader = c.req.header('Authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return c.json({ success: false, error: 'Unauthorized' }, 401);
		}

		const idToken = authHeader.split(' ')[1];
		const decoded = await verifyFirebaseToken(idToken);
		if (!decoded) {
			return c.json({ success: false, error: 'Invalid token' }, 401);
		}

		const body = await c.req.json<{ photos: PhotoData[] }>();
		const photos = body.photos;

		if (!photos || photos.length === 0) {
			return c.json({ success: true, count: 0 });
		}

		const uploaderId = decoded.uid;
		const photoIds = await batchSavePhotos(c.env, uploaderId, null, photos);

		// Sync to Algolia
		const algoliaObjects = photos.map((p, i) => ({
			id: photoIds[i],
			...p,
			objectID: photoIds[i],
			createdAt: new Date().toISOString(),
			_geoloc: (p.latitude && p.longitude) ? { lat: p.latitude, lng: p.longitude } : undefined
		}));

		c.executionCtx.waitUntil(syncPhotosToAlgolia(c.env, algoliaObjects));

		return c.json({ success: true, count: photos.length, ids: photoIds });

	} catch (error: any) {
		console.error('Worker Error:', error);
		return c.json({ success: false, error: error.message }, 500);
	}
});

app.post('/api/sign-upload', async (c) => {
	try {
		const authHeader = c.req.header('Authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return c.json({ success: false, error: 'Unauthorized' }, 401);
		}

		const idToken = authHeader.split(' ')[1];
		const decoded = await verifyFirebaseToken(idToken);
		if (!decoded) {
			return c.json({ success: false, error: 'Invalid token' }, 401);
		}

		const body = await c.req.json<{ params: Record<string, any> }>();
		const params = body.params;
		const sortedParams = Object.keys(params)
			.sort()
			.map(key => `${key}=${params[key]}`)
			.join('&');

		const stringToSign = `${sortedParams}${c.env.CLOUDINARY_API_SECRET}`;
		const msgUint8 = new TextEncoder().encode(stringToSign);
		const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

		return c.json({
			success: true,
			signature,
			timestamp: params.timestamp,
			apiKey: c.env.CLOUDINARY_API_KEY
		});

	} catch (error: any) {
		console.error('Sign Error:', error);
		return c.json({ success: false, error: error.message }, 500);
	}
});

// 🗄️ Storage (R2): 元画像バックアップ
app.post('/api/r2/upload', async (c) => {
	try {
		const authHeader = c.req.header('Authorization');
		if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

		const idToken = authHeader.split(' ')[1];
		const decoded = await verifyFirebaseToken(idToken);
		if (!decoded) return c.json({ error: 'Invalid token' }, 401);

		const formData = await c.req.formData();
		const file = formData.get('file') as File | null;
		const key = formData.get('key') as string | null;

		if (!file || !key) return c.json({ error: 'file and key are required' }, 400);

		const buffer = await file.arrayBuffer();
		await c.env.R2_BUCKET.put(key, buffer, {
			httpMetadata: { contentType: file.type || 'image/jpeg' },
			customMetadata: { uploaderId: decoded.uid, uploadedAt: new Date().toISOString() }
		});

		return c.json({ success: true, key, size: buffer.byteLength });
	} catch (e: any) {
		console.error('R2 upload error:', e);
		return c.json({ error: e.message }, 500);
	}
});

// 管理者用: R2からオリジナル画像を取得
app.get('/api/r2/download/:key{.+}', async (c) => {
	try {
		const authHeader = c.req.header('Authorization');
		if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);

		const idToken = authHeader.split(' ')[1];
		const decoded = await verifyFirebaseToken(idToken);
		if (!decoded) return c.json({ error: 'Invalid token' }, 401);

		const key = c.req.param('key');
		const object = await c.env.R2_BUCKET.get(key);

		if (!object) return c.json({ error: 'Not found' }, 404);

		return new Response(object.body, {
			headers: {
				'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
				'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`,
				'Cache-Control': 'private, no-cache',
			}
		});
	} catch (e: any) {
		return c.json({ error: e.message }, 500);
	}
});

export default app;
