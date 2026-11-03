import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanChartRows, convertSize, isAccessory, pairVariants, sizeCode } from './index';

test('pair variants combine sizes and colours and skip existing', () => {
  const v = pairVariants('nk1', ['8', '9'], [['Black', '#000'], ['Off white', '#fff']], ['8 / Black']);
  assert.deepEqual(v.map((x) => x.name), ['8 / Off white', '9 / Black', '9 / Off white']);
  assert.equal(v[1].barcode, 'NK19B');
  assert.equal(sizeCode('42'), '42');
  assert.equal(pairVariants('nk1', ['8'], [['Black', '#000']], [], true, 'PK')[0].name, 'PK 8 / Black');
  assert.equal(v[0].sku, 'NK1-8-OW');
});

test('conversion finds a row by any system', () => {
  assert.equal(convertSize('men', 'eu', '42')?.pk, '8');
  assert.equal(convertSize('men', 'pk', '9')?.cm, '27.5');
  assert.equal(convertSize('women', 'us', '99'), null);
  assert.equal(isAccessory('SOCK'), true);
  assert.deepEqual(cleanChartRows([{ pk: ' 8 ', eu: '' }, { pk: '', eu: '' }]), [{ pk: '8' }]);
});
