import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLensNamesFromProfileData } from './exifSuggestions';

test('extracts lens names from profile arrays and objects', () => {
  const result = extractLensNamesFromProfileData({
    lenses: [
      '• FE 35mm F1.4 GM',
      { name: 'Sony FE 24-70mm F2.8 GM II' },
      ['  Sigma 24mm F2 DG DN', { name: 'Voigtlander NOKTON 40mm F1.4' }],
    ],
    lensDetails: [
      { name: 'Canon RF 85mm F1.2L USM' },
      '--- old section',
    ],
  });

  assert.deepEqual(result, [
    'FE 35mm F1.4 GM',
    'Sony FE 24-70mm F2.8 GM II',
    'Sigma 24mm F2 DG DN',
    'Voigtlander NOKTON 40mm F1.4',
    'Canon RF 85mm F1.2L USM',
  ]);
});

test('returns empty array for empty or invalid profile data', () => {
  assert.deepEqual(extractLensNamesFromProfileData(null), []);
  assert.deepEqual(extractLensNamesFromProfileData({}), []);
});
