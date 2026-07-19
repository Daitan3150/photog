import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFullAddress } from './address.ts';

test('buildFullAddress composes zip/prefecture/city in a readable order', () => {
  assert.equal(
    buildFullAddress({
      address: '',
      addressZip: '100-0001',
      addressPref: '東京都',
      addressCity: '千代田区',
      addressDetail: '丸の内1-1',
    }),
    '〒100-0001 東京都 千代田区 丸の内1-1'
  );
});

test('buildFullAddress preserves an explicit full address when provided', () => {
  assert.equal(
    buildFullAddress({
      address: '北海道札幌市中央区',
      addressZip: '060-0000',
      addressPref: '北海道',
      addressCity: '札幌市中央区',
    }),
    '北海道札幌市中央区'
  );
});
