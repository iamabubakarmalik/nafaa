import { presetDoc } from './theme/presets';
import { applyUrdu, batchOf, parseUrdu, proposeUrdu, urduTargets } from './theme/urdu-fill';
import { storeReturnUrl } from './lib/host';
import { deliveryQuote } from './lib/shipping';
import { readShipping } from './store-settings';
import { StoreCatalogService, ratingMap } from './store-catalog.service';
import { resolveTags } from './store-revalidate.service';
import { safeReturnUrl } from '../online-orders/payment-links.service';

describe('Urdu for a theme', () => {
  const docWith = () => {
    const doc = presetDoc('fashion');
    const msg = doc.global.announcement.blocks![0];
    msg.settings.text = { en: 'Free delivery', ur: 'مفت ڈیلیوری' };
    doc.global.announcement.blocks!.push({ id: 'b-two', type: 'message', settings: { text: 'Cash on delivery', link: '' } });
    doc.global.announcement.blocks!.push({ id: 'b-three', type: 'message', settings: { text: { en: 'Easy returns', ur: '' }, link: '' } });
    doc.global.announcement.blocks!.push({ id: 'b-four', type: 'message', settings: { text: '', link: '' } });
    return doc;
  };

  it('only picks text with English and an empty Urdu box', () => {
    const doc = docWith();
    const t = urduTargets(doc).filter((x) => x.sectionId === doc.global.announcement.id);
    const texts = t.map((x) => x.en);
    expect(texts).toContain('Cash on delivery');
    expect(texts).toContain('Easy returns');
    expect(texts).not.toContain('Free delivery');
    expect(t.every((x) => x.where === 'global' && x.key === 'text')).toBe(true);
  });

  it('never overwrites Urdu the merchant wrote, even when asked to', () => {
    const doc = docWith();
    const first = doc.global.announcement.blocks![0];
    const out = applyUrdu(doc, [
      { where: 'global', sectionId: doc.global.announcement.id, blockId: first.id, key: 'text', en: 'Free delivery', ur: 'غلط' },
      { where: 'global', sectionId: doc.global.announcement.id, blockId: 'b-two', key: 'text', en: 'Cash on delivery', ur: 'کیش آن ڈیلیوری' },
      { where: 'global', sectionId: doc.global.announcement.id, blockId: 'b-three', key: 'text', en: 'Changed meanwhile', ur: 'آسان واپسی' },
    ]);
    const blocks = out.global.announcement.blocks!;
    expect(blocks[0].settings.text).toEqual({ en: 'Free delivery', ur: 'مفت ڈیلیوری' });
    expect(blocks.find((b) => b.id === 'b-two')!.settings.text).toEqual({ en: 'Cash on delivery', ur: 'کیش آن ڈیلیوری' });
    expect(blocks.find((b) => b.id === 'b-three')!.settings.text).toEqual({ en: 'Easy returns', ur: '' });
    expect(doc.global.announcement.blocks!.find((b) => b.id === 'b-two')!.settings.text).toBe('Cash on delivery');
  });

  it('keeps only Urdu-script answers and reports what is left', async () => {
    const targets = urduTargets(docWith());
    const r = await proposeUrdu(targets, async (items) => new Map(items.map((i) => [i.i, i.i === 0 ? 'Not urdu' : 'اردو متن'])));
    expect(r.total).toBe(targets.length);
    expect(r.changes.length).toBe(batchOf(targets).length - 1);
    expect(r.remaining).toBe(targets.length - r.changes.length);
    expect(r.changes.every((c) => /[؀-ۿ]/.test(c.ur))).toBe(true);
  });

  it('reads the model answer defensively', () => {
    expect(parseUrdu('Here: {"items":[{"i":0,"ur":"سلام"},{"i":1,"ur":"hello"},{"i":"x","ur":"سلام"}]}')).toEqual(new Map([[0, 'سلام']]));
    expect(parseUrdu('no json').size).toBe(0);
  });
});

describe('payment return page', () => {
  const hosts = ['hiba.stores.nafaa.pk', 'www.hiba.pk'];
  it('accepts https pages on the store hosts only', () => {
    expect(storeReturnUrl('https://www.hiba.pk/orders/abc', hosts)).toBe('https://www.hiba.pk/orders/abc');
    expect(storeReturnUrl('https://hiba.stores.nafaa.pk/orders/abc', hosts)).toBe('https://hiba.stores.nafaa.pk/orders/abc');
    expect(storeReturnUrl('http://www.hiba.pk/orders/abc', hosts)).toBeNull();
    expect(storeReturnUrl('https://evil.com/orders/abc', hosts)).toBeNull();
    expect(storeReturnUrl('https://www.hiba.pk.evil.com/x', hosts)).toBeNull();
    expect(storeReturnUrl('https://user@www.hiba.pk/x', hosts)).toBeNull();
    expect(storeReturnUrl('https://www.hiba.pk:8443/x', hosts)).toBeNull();
    expect(storeReturnUrl('javascript:alert(1)', hosts)).toBeNull();
    expect(storeReturnUrl(null, hosts)).toBeNull();
  });
  it('allows the local storefront only when given', () => {
    expect(storeReturnUrl('http://localhost:3300/orders/abc?store=hiba', hosts, 'http://localhost:3300')).toBe('http://localhost:3300/orders/abc?store=hiba');
    expect(storeReturnUrl('http://localhost:3300/orders/abc', hosts)).toBeNull();
  });
  it('payment links keep only safe stored pages', () => {
    expect(safeReturnUrl('https://www.hiba.pk/orders/abc')).toBe('https://www.hiba.pk/orders/abc');
    expect(safeReturnUrl('http://www.hiba.pk/orders/abc')).toBeNull();
    expect(safeReturnUrl('data:text/html,x')).toBeNull();
  });
});

describe('product card ratings', () => {
  it('rounds and skips empty rows', () => {
    const m = ratingMap([{ pid: 'a', avg: 4.333, count: BigInt(3) }, { pid: 'b', avg: null, count: 0 }, { pid: null, avg: 5, count: 1 }]);
    expect(m.get('a')).toEqual({ average: 4.3, count: 3 });
    expect(m.has('b')).toBe(false);
    expect(m.size).toBe(1);
  });
  it('loads every product in one query', async () => {
    const $queryRaw = jest.fn().mockResolvedValue([{ pid: 'p1', avg: 4.5, count: BigInt(2) }, { pid: 'p3', avg: 3, count: BigInt(1) }]);
    const svc = new StoreCatalogService({ $queryRaw } as any);
    const m = await svc.ratingsFor('t1', ['p1', 'p2', 'p3', 'p1']);
    expect($queryRaw).toHaveBeenCalledTimes(1);
    expect(m.get('p1')).toEqual({ average: 4.5, count: 2 });
    expect(m.get('p2')).toBeUndefined();
    expect(m.get('p3')).toEqual({ average: 3, count: 1 });
    expect(await svc.ratingsFor('t1', [])).toEqual(new Map());
    expect($queryRaw).toHaveBeenCalledTimes(1);
  });
});

describe('delivery quote without a cart', () => {
  const shipping = readShipping({
    codFee: 50,
    freeShippingThreshold: 5000,
    zones: [
      { id: 'lhr', name: 'Lahore', cities: ['Lahore'], provinces: [], codEnabled: true, rates: [{ id: 'std', name: 'Standard', type: 'flat', price: 150 }] },
      { id: 'far', name: 'Far', cities: ['Gilgit'], provinces: [], codEnabled: false, rates: [{ id: 'std', name: 'Standard', type: 'flat', price: 400 }] },
    ],
  });
  it('quotes the city with COD when checkout allows it', () => {
    const q = deliveryQuote(shipping, { enabled: true, maxOrder: null }, { city: 'Lahore', subtotal: 1200, weightKg: 0.5 });
    expect(q.zone).toBe('Lahore');
    expect(q.rates[0]).toMatchObject({ price: 150, codAvailable: true, codFee: 50 });
    expect(q.freeShipping).toEqual({ threshold: 5000, remaining: 3800 });
  });
  it('follows COD off, zone COD off and the COD limit', () => {
    expect(deliveryQuote(shipping, { enabled: false, maxOrder: null }, { city: 'Lahore', subtotal: 1200, weightKg: 0 }).rates[0].codAvailable).toBe(false);
    expect(deliveryQuote(shipping, { enabled: true, maxOrder: null }, { city: 'Gilgit', subtotal: 1200, weightKg: 0 }).rates[0].codAvailable).toBe(false);
    const capped = deliveryQuote(shipping, { enabled: true, maxOrder: 1300 }, { city: 'Lahore', subtotal: 1200, weightKg: 0 }).rates[0];
    expect(capped).toMatchObject({ codAvailable: false, codFee: 0 });
  });
  it('free above the threshold', () => {
    expect(deliveryQuote(shipping, { enabled: true, maxOrder: null }, { city: 'Lahore', subtotal: 6000, weightKg: 0 }).rates[0].price).toBe(0);
  });
});

describe('resolve tags', () => {
  it('covers the slug and each host once', () => {
    expect(resolveTags('hiba', ['www.hiba.pk', 'hiba.pk', 'WWW.hiba.pk'])).toEqual(['resolve:hiba', 'resolve:www.hiba.pk', 'resolve:hiba.pk']);
  });
});
