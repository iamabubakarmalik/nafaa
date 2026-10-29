import { costPerOrder, detectColumns, guessPlatform, monthFirstDates, parseAmount, parseDay, readAdsExport, roas, spreadOverProducts, weekOf } from './ads-math';

describe('ads maths', () => {
  it('works out ROAS and cost per order', () => {
    expect(roas(50_000, 10_000)).toBe(5);
    expect(roas(12_345, 4_000)).toBe(3.09);
    expect(roas(1000, 0)).toBeNull();
    expect(costPerOrder(10_000, 40)).toBe(250);
    expect(costPerOrder(10_000, 0)).toBeNull();
  });

  it('finds Meta export columns by header', () => {
    const headers = ['Reporting starts', 'Reporting ends', 'Campaign name', 'Results', 'Cost per result', 'Amount spent (PKR)', 'Purchases'];
    expect(detectColumns(headers)).toEqual({ date: 0, spend: 5, campaign: 2, orders: 6 });
    expect(guessPlatform(headers)).toBe('META');
  });

  it('finds TikTok export columns by header', () => {
    const headers = ['By Day', 'Campaign name', 'Cost', 'CPC (destination)', 'Complete payment', 'Impressions'];
    const map = detectColumns(headers);
    expect(map.date).toBe(0);
    expect(map.spend).toBe(2);
    expect(map.campaign).toBe(1);
    expect(map.orders).toBe(4);
    expect(guessPlatform(headers)).toBe('TIKTOK');
  });

  it('reads amounts and dates in common shapes', () => {
    expect(parseAmount('Rs 1,234.50')).toBe(1234.5);
    expect(parseAmount('PKR 900')).toBe(900);
    expect(parseAmount('1.234,50')).toBe(1234.5);
    expect(parseAmount('')).toBeNull();
    expect(parseDay('2026-10-28')).toBe('2026-10-28');
    expect(parseDay('28/10/2026')).toBe('2026-10-28');
    expect(parseDay('10/28/2026', true)).toBe('2026-10-28');
    expect(parseDay('Oct 28, 2026')).toBe('2026-10-28');
    expect(parseDay('28 Oct 2026')).toBe('2026-10-28');
    expect(parseDay('Total')).toBeNull();
    expect(monthFirstDates(['10/28/2026', '10/29/2026'])).toBe(true);
    expect(monthFirstDates(['28/10/2026', '03/04/2026'])).toBe(false);
  });

  it('sums an export per day and campaign and skips total rows', () => {
    const headers = ['Day', 'Campaign name', 'Amount spent (PKR)', 'Purchases'];
    const rows = [
      ['2026-10-27', 'Winter sale', '1,000', '4'],
      ['2026-10-27', 'Winter sale', '500', '1'],
      ['2026-10-27', 'Retarget', '300', ''],
      ['2026-10-28', 'Winter sale', '1200', '6'],
      ['', '', '3000', '11'],
    ];
    const r = readAdsExport(headers, rows, 'META');
    expect(r.needs).toEqual([]);
    expect(r.skipped).toBe(1);
    expect(r.rows).toHaveLength(3);
    const winter27 = r.rows.find((x) => x.day === '2026-10-27' && x.campaign === 'Winter sale')!;
    expect(winter27.amount).toBe(1500);
    expect(winter27.orders).toBe(5);
    expect(winter27.importKey).toBe('META|2026-10-27|winter sale');
  });

  it('asks for a column it cannot find and takes the shop mapping', () => {
    const headers = ['Din', 'Paisa'];
    const rows = [['28/10/2026', '700']];
    expect(readAdsExport(headers, rows, 'OTHER').needs).toEqual(['date', 'spend']);
    const mapped = readAdsExport(headers, rows, 'OTHER', { date: 0, spend: 1 });
    expect(mapped.rows).toEqual([{ day: '2026-10-28', campaign: null, amount: 700, orders: null, importKey: 'OTHER|2026-10-28|' }]);
  });

  it('spreads product spend by sales, equally when nothing sold', () => {
    const by = spreadOverProducts(900, ['a', 'b'], (id) => (id === 'a' ? 2000 : 1000));
    expect(by.get('a')).toBeCloseTo(600);
    expect(by.get('b')).toBeCloseTo(300);
    const even = spreadOverProducts(900, ['a', 'b', 'c'], () => 0);
    expect(even.get('c')).toBeCloseTo(300);
  });

  it('starts weeks on Monday', () => {
    expect(weekOf('2026-10-29')).toBe('2026-10-26');
    expect(weekOf('2026-10-26')).toBe('2026-10-26');
    expect(weekOf('2026-11-01')).toBe('2026-10-26');
  });
});
