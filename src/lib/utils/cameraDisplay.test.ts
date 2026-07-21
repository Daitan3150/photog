import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCameraDisplayLabel } from './cameraDisplay';

test('combines camera model and sensor size', () => {
  assert.equal(formatCameraDisplayLabel('ILCE-7RM5', 'フルサイズ'), 'ILCE-7RM5 - フルサイズ');
});

test('falls back to camera model when sensor size is empty', () => {
  assert.equal(formatCameraDisplayLabel('ILCE-7RM5', ''), 'ILCE-7RM5');
});

test('uses sensor size alone when camera name is missing', () => {
  assert.equal(formatCameraDisplayLabel('', 'APS-C'), 'APS-C');
});
