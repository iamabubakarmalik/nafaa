import { checkPack, matchScan } from './order-scan';

const lines = [
  { index: 0, name: 'Shirt M', quantity: 2, codes: ['8964001', 'SH-M'] },
  { index: 1, name: 'Cap', quantity: 1, codes: ['CAP1'] },
  { index: 2, name: 'Gift card', quantity: 1, codes: [] },
];

describe('scan to pack', () => {
  it('a scan fills the first line still short', () => {
    expect(matchScan(lines, {}, ' 8964001 ')).toEqual({ kind: 'OK', index: 0, done: false });
    expect(matchScan(lines, { 0: 1 }, 'sh-m')).toEqual({ kind: 'OK', index: 0, done: true });
  });
  it('one piece too many is an extra', () => {
    expect(matchScan(lines, { 0: 2 }, 'SH-M')).toEqual({ kind: 'EXTRA', index: 0 });
  });
  it('an item not in the order is wrong', () => {
    expect(matchScan(lines, {}, 'XYZ')).toEqual({ kind: 'WRONG' });
  });
  it('packed only when every line is exact; lines without codes are ticked by hand', () => {
    expect(checkPack(lines, { 0: 2, 1: 1 }, [2])).toEqual({ ok: true });
    expect(checkPack(lines, { 0: 2, 1: 1 }, [])).toMatchObject({ ok: false });
    expect(checkPack(lines, { 0: 1, 1: 1 }, [2])).toEqual({ ok: false, message: 'Shirt M: 1 abhi scan nahi hue' });
    expect(checkPack(lines, { 0: 3, 1: 1 }, [2])).toMatchObject({ ok: false, message: expect.stringContaining('zyada') });
    // A hand tick never stands in for a line that has a barcode.
    expect(checkPack(lines, { 0: 2 }, [1, 2])).toMatchObject({ ok: false });
  });
});
