import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCroppedOgImageUrl, resolveOgImageSource } from './ogp.ts';

test('buildCroppedOgImageUrl uses auto crop by default', () => {
  const result = buildCroppedOgImageUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg');
  assert.equal(result, 'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630,q_auto,f_auto/sample.jpg');
});

test('buildCroppedOgImageUrl applies focal point from search param', () => {
  const result = buildCroppedOgImageUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg', { x: 40, y: 20 }, '45_25');
  assert.equal(result, 'https://res.cloudinary.com/demo/image/upload/c_fill,g_xy_center,x_45p,y_25p,w_1200,h_630,q_auto,f_auto/sample.jpg');
});

test('resolveOgImageSource prefers the dedicated share OGP image', () => {
  const result = resolveOgImageSource({
    url: 'https://example.com/main.jpg',
    shareOgImageUrl: 'https://example.com/share-ogp.jpg',
  });
  assert.equal(result, 'https://example.com/share-ogp.jpg');
});

test('resolveOgImageSource falls back to the photo URL', () => {
  const result = resolveOgImageSource({ url: 'https://example.com/main.jpg' });
  assert.equal(result, 'https://example.com/main.jpg');
});
